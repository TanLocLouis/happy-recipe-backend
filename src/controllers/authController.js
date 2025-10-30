import { pool } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

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

function generateVerificationEmail(email, token) { 
    return `
        <!DOCTYPE html>
        <html>
        <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                background-color: #f9f9f9;
                color: #333;
            }
            .email-container {
                max-width: 600px;
                margin: 20px auto;
                background: #fff;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .email-header {
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                color: #0056b3;
                margin-bottom: 20px;
            }
            .email-body {
                font-size: 16px;
            }
            .email-link {
                display: inline-block;
                margin: 20px 0;
                padding: 10px 20px;
                background-color: #007bff;
                color: #fff;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
            }
            .email-link:hover {
                background-color: #0056b3;
            }
            .email-footer {
                font-size: 12px;
                text-align: center;
                color: #999;
                marginTop: 20px;
            }
        </style>
        </head>
        <body>
        <div className="email-container">
            <div className="email-header">
                Verify Your New Account
            </div>
            <div className="email-body">
                <p>Welcome! Please use the code below to verify your account:</p>
                <a className="email-link">
                    ${token}
                </a>
            </div>
            <div className="email-footer">
                <p>If you didn’t request this email, you can safely ignore it.</p>
            </div>
        </div>
        </body>
        </html>
    `
};

// Send verify email to new user
export function sendMail(email, code) {
    // console.log("Sending email to: ", email, " with code: ", code);
  if (!process.env.VITE_MAIL || !process.env.VITE_MAILTOKEN) {
    console.warn('[WARN] Mail credentials not set (VITE_MAIL / VITE_MAILTOKEN). Email sending will likely fail.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.VITE_MAIL,
      pass: process.env.VITE_MAILTOKEN
    }
  })

    const email_content = generateVerificationEmail(email, code); 
  const mailOptions = {
    from: process.env.VITE_MAIL,
    to: email,
    subject: 'ACCOUNT CONFIRMATION',
    html: email_content
  }
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log('[ERROR] MAIL SENDER: ', err)
        else console.log('[INFO] MAIL SENDER: ', info.response)
    })
}


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
    sendMail(user.email, code);
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

