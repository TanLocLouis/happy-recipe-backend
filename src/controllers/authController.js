import { pool } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { randomUUID } from 'crypto';
import { sendMail } from '../services/mailer.js';

export async function signup(req, res) {
  const { firstName, lastName, email, password } = req.body;

  console.log("Signup endpoint hit");
  console.log(req.body);

  const displayName = firstName + lastName;

  try {
    const [existingUsers] = await pool.query(
      'SELECT user_id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    // Check if email already exists
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username or email already taken' });
    }

    // Use hash funtion to protect password
    const passwordHash = await hashPassword(password);

    // Generate UUID for user and insert new user into database
    const userId = randomUUID();
    await pool.query(
      'INSERT INTO users (user_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, displayName  || null]
    );
    // const accessToken = signToken({ userId });
    // const refreshToken = signToken({ userId, type: 'refresh' });
    // const tempToken = signToken({ userId });
    return res.status(201).json({
      user: { userId, email, firstName, lastName },
      // accessToken,
      // refreshToken,
      // tempToken
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Mail sending has been extracted to `src/services/mailer.js`.


export async function login(req, res) {
  const { email, password } = req.body;
  try {
    // Check if user exists
    const [rows] = await pool.query(
      'SELECT user_id, username, display_name, email, password_hash, is_active FROM users WHERE (email = ?) LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

    const userId = user.user_id;
  const tempToken = signToken({ userId });

    // Generate code and tempToken
    // Insert code and tempToken into database with expiration
    const code = Math.floor(1000000 + Math.random() * 8999999).toString();

    // Check if a 2FA code already exists for this user
    const [result] = await pool.query(
      'SELECT * FROM 2fa WHERE user_id = ?',
      [userId]
    );
    if (result.length > 0) {
      // If 2fa code expired, delete it
      if (new Date(result[0].expires_at) < new Date()) {
        await pool.query(
          'DELETE FROM 2fa WHERE user_id = ?',
          [userId]
        );
      } else {
        // If not expired, inform user to check email
        return res.status(200).json({ message: '2FA code already sent. Please check your email.' });
      }
    }

    // Send email with code
    await sendMail(user.email, code);
    await pool.query(
      'INSERT INTO 2fa (user_id, code, temp_token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 MINUTE))',
      [userId, code, tempToken]
    );

    return res.json({
      tempToken
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

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function validate2FA(req, res) {
  const tempToken = req.headers['authorization']?.split(' ')[1];
  const code = req.body.code;

  // console.log(tempToken);
  // console.log(code);

  try {
    // Check if user exists
    const [rows] = await pool.query(
      `SELECT 2fa.user_id, username, display_name, email, password_hash, is_active FROM 2fa
      JOIN users ON users.user_id = 2fa.user_id 
      WHERE (code = ?) LIMIT 1`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid 2fa code' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const userId = user.user_id;
    const accessToken = signToken({ userId: userId, username: user.username });
    const refreshToken = signToken({ userId, type: 'refresh' });

    return res.status(200).json({
      message: "2FA validation successful",
      accessToken,
      refreshToken
    });
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

