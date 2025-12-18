import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { randomUUID } from 'crypto';
import { sendMail } from '../services/mailer.js';

import prisma from '../config/prisma.js';

export async function signup(req, res) {
  const { firstName, lastName, email, password } = req.body;
  const displayName = ((firstName || '') + (lastName ? ' ' + lastName : '')).trim() || null;

  if (!email || !password) return res.status(400).json({ message: 'Missing required fields' });

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ message: 'Username or email already taken' });

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();

    await prisma.users.create({
      data: {
        user_id: userId,
        email,
        password_hash: passwordHash,
        display_name: displayName || null
      }
    });

    return res.status(201).json({ user: { userId, email, firstName, lastName } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Mail sending has been extracted to `src/services/mailer.js`.
export async function login(req, res) {
  const { email, password } = req.body;
  try {
    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { email },
        select: { 
          user_id: true, 
          username: true, 
          display_name: true, 
          email: true, 
          password_hash: true, 
          is_active: true 
        }
    });

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await prisma.users.update({ where: { user_id: user.user_id }, data: { last_login: new Date() } });

    const userId = user.user_id;
    const twoFactorToken = signToken({ userId });

    // Generate code and twoFactorToken 
    // Insert code and twoFactorToken into database with expiration
    const code = Math.floor(100000 + Math.random() * 899999).toString();

    // Check if a 2FA code already exists for this user
    const existing2fa = await prisma.fa.findUnique({ where: { user_id: userId } });
    if (existing2fa) {
      if (existing2fa.expires_at && new Date(existing2fa.expires_at) < new Date()) {
        await prisma.fa.delete({ where: { user_id: userId } });
      } else {
        return res.status(200).json({ status: 'require2FA', message: '2FA code already sent. Please check your email.' });
      }
    }

    // Send email with code
    sendMail(user.email, code);
    await prisma.fa.create({ data: { user_id: userId, 
      code, 
      two_factor_token: twoFactorToken, 
      expires_at: new Date(Date.now() + Number(process.env.TWO_FA_EXPIRES_IN) || 15*60*1000)
    } });

    return res.status(200).json({
      status: "require2FA",
      message: '2FA code sent to email',
      twoFactorToken
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Exchange a refresh token for a new access token
export async function requestNewAccessToken(req, res) {
  try {
    const refreshToken = req.body.refreshToken || req.headers['authorization']?.split(' ')[1];
    if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Ensure this is a refresh token if your tokens include a type field
    if (payload.type && payload.type !== 'refresh') {
      return res.status(400).json({ message: 'Provided token is not a refresh token' });
    }

    const userId = payload.userId || payload.user_id;
    if (!userId) return res.status(400).json({ message: 'Invalid token payload' });

    // Issue a new access token (short-lived)
    const accessToken = signToken({ userId, username: payload.username }, '15m');

    // For now we reuse the same refresh token. If you want rotation, issue a new
    // refresh token here instead.
    return res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Validate an access token coming from the frontend.
// This is used by the web app's AuthContext `validateAccessToken` helper.
export async function validateAccessToken(req, res) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired access token' });
    }

    // If you ever tag refresh tokens with a `type` field, make sure we are
    // not accidentally validating a refresh token here.
    if (payload.type && payload.type === 'refresh') {
      return res.status(400).json({ message: 'Provided token is not an access token' });
    }

    const userId = payload.userId || payload.user_id;

    return res.status(200).json({
      message: 'Access token is valid',
      user: {
        userId,
        username: payload.username || null
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getUserInfo(req, res) {
  // Prefer userId injected by auth middleware; fall back to params/query/body for flexibility
  const userId = req.userId || req.params?.userId || req.query?.userId || req.body?.userId;

  try {
    if (!userId) return res.status(400).json({ message: 'Missing userId' });

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        display_name: true,
        email: true,
        is_active: true,
        bio: true,
        profile_image_url: true,
        is_verified: true,
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.is_active) return res.status(403).json({ message: 'Account is disabled' });

    const userInfo = {
      userId: user.user_id,
      username: user.username || null,
      displayName: user.display_name || null,
      email: user.email,
      bio: user.bio || null,
      profileImageUrl: user.profile_image_url || null,
      isVerified: user.is_verified || false,
    };
    return res.status(200).json(userInfo);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function validate2FA(req, res) {
  const twoFactorToken = req.headers['authorization']?.split(' ')[1];
  const code = req.body.code;

  try {
    // Find 2FA record and include user
    const record = await prisma.fa.findFirst({ where: { code }, include: { users: true } });
    if (!record) return res.status(401).json({ message: 'Invalid 2fa code' });

    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      await prisma.fa.delete({ where: { user_id: record.user_id } }).catch(() => {});
      return res.status(401).json({ message: '2FA code expired' });
    }

    const user = record.users;
    if (!user || !user.is_active) return res.status(403).json({ message: 'Account is disabled' });

    const userId = user.user_id;
    const accessToken = signToken({ userId, username: user.username }, '15m');
    const refreshToken = signToken({ userId, type: 'refresh' });

    // delete used 2FA record
    await prisma.fa.delete({ where: { user_id: record.user_id } }).catch(() => {});

    return res.status(200).json({
      message: '2FA validation successful',
      user: { userId: user.user_id, username: user.username, displayName: user.display_name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

