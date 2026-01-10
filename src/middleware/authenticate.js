import { verifyToken } from "../utils/jwt.js";

/**
 * Required authentication middleware
 * Verifies JWT token from Authorization header and attaches userId to req.userId
 * Returns 401 if token is missing or invalid
 */
export function authenticate(req, res, next) {
  // console.log('[DEBUG] authenticate middleware called');
  console.log("Headers:", req.headers);
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userId = payload.userId || payload.user_id;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Check if token is a refresh token (should not be used for authentication)
    if (payload.type && payload.type === "refresh") {
      return res.status(400).json({ message: "Refresh tokens cannot be used for authentication" });
    }

    // Attach user info to request object
    req.userId = userId;
    req.user = {
      userId,
      username: payload.username || null,
    };

    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Optional authentication middleware
 * Attempts to verify JWT token but doesn't fail if token is missing
 * Attaches userId to req.userId if token is valid, otherwise leaves it undefined
 */
export function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      // Invalid format, continue without authentication
      return next();
    }

    try {
      const payload = verifyToken(token);
      const userId = payload.userId || payload.user_id;

      if (userId && (!payload.type || payload.type !== "refresh")) {
        // Valid access token, attach user info
        req.userId = userId;
        req.user = {
          userId,
          username: payload.username || null,
        };
      }
    } catch (err) {
      // Token invalid or expired, continue without authentication
      // This allows public access to routes that use optional auth
    }

    next();
  } catch (err) {
    console.error("Optional authentication error:", err);
    // Even on error, continue without authentication for optional auth
    next();
  }
}
