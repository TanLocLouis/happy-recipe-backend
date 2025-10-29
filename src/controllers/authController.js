import { pool } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

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

    // Insert new user into database
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      [email, passwordHash, displayName  || null]
    );

    const userId = result.insertId;
    const token = signToken({ userId });
    return res.status(201).json({
      user: { userId, email, firstName, lastName},
      token
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
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

    const token = signToken({ userId: user.user_id, username: user.username });
    return res.json({
      user: { userId: user.user_id, username: user.username, display_name: user.display_name, email: user.email },
      token
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

