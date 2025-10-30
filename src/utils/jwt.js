import jwt from 'jsonwebtoken';

const { JWT_SECRET = 'dev_secret', JWT_EXPIRES_IN = '7d' } = process.env;

// signToken accepts an optional expiresIn override (e.g., '15m' for access tokens)
export function signToken(payload, expiresInOverride) {
  const expiresIn = expiresInOverride || JWT_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

