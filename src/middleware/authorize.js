import prisma from '../config/prisma.js';

/**
 * Middleware to check if user has moderator or admin role
 * Must be used after authenticate middleware
 * Attaches user role to req.userRole
 */
export async function requireModerator(req, res, next) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Fetch user with role
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { 
        user_id: true, 
        role: true, 
        is_active: true 
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    // Check if user has MODERATOR or ADMIN role
    if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Moderator privileges required.' });
    }

    // Attach role to request
    req.userRole = user.role;

    next();
  } catch (err) {
    console.error('Authorization error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Middleware to check if user has admin role
 * Must be used after authenticate middleware
 */
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Fetch user with role
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { 
        user_id: true, 
        role: true, 
        is_active: true 
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    // Check if user has ADMIN role
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Attach role to request
    req.userRole = user.role;

    next();
  } catch (err) {
    console.error('Authorization error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
