import { Router } from 'express';
import { getUserProfile, getUserNotifications, markNotificationAsRead, getUserPosts } from '../controllers/usersController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// GET /api/users/:user_id - Get user profile info for browsing
router.get('/:user_id', getUserProfile);

/**
 * GET /api/users/:user_id/posts
 * Get posts by a specific user with pagination
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 */
router.get(
	'/posts/:user_id',
	// optionalAuthenticate,
	[
		param('user_id').isString().notEmpty(),
		query('page').optional().isInt({ min: 1 }),
		query('limit').optional().isInt({ min: 1, max: 100 })
	],
	validateRequest,
	getUserPosts
);

/**
 * GET /api/users/notifications
 * Get user's notifications with pagination
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 */
router.get(
	'/notifications/list',
	authenticate,
	[
		query('page').optional().isInt({ min: 1 }),
		query('limit').optional().isInt({ min: 1, max: 100 })
	],
	validateRequest,
	getUserNotifications
);

/**
 * PATCH /api/users/notifications/:notificationId/read
 * Mark notification as read
 */
router.patch(
	'/notifications/:notificationId/read',
	authenticate,
	[
		param('notificationId').isString().notEmpty()
	],
	validateRequest,
	markNotificationAsRead
);

export default router;
