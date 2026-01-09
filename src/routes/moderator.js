import { Router } from 'express';
import { query } from 'express-validator';
import { 
  getAllPosts, 
  getAllComments, 
  getAllUsers,
  getModerationStats,
  deletePost,
  deleteComment,
  restorePost,
  warnUser,
  banUser,
  unbanUser,
  notifyUser,
  notifyUserWarned
} from '../controllers/moderatorController.js';

import { param, body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireModerator } from '../middleware/authorize.js';

const router = Router();

// All routes require authentication + moderator role
router.use(authenticate);
router.use(requireModerator);

/**
 * GET /api/moderator/posts
 * Get all posts with filtering and pagination
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 *   - includeDeleted: boolean (default false)
 *   - userId: string (filter by user)
 *   - search: string (search in title/description)
 */
router.get(
  '/posts',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('start').optional().isInt({ min: 0 }),
    query('end').optional().isInt({ min: 0 }),
    query('includeDeleted').optional().isBoolean(),
    query('userId').optional().isString(),
    query('search').optional().isString()
  ],
  validateRequest,
  getAllPosts
);

/**
 * GET /api/moderator/comments
 * Get all comments with filtering and pagination
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 *   - includeDeleted: boolean (default false)
 *   - userId: string (filter by user)
 *   - postId: string (filter by post)
 *   - search: string (search in comment text)
 */
router.get(
  '/comments',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('includeDeleted').optional().isBoolean(),
    query('userId').optional().isString(),
    query('postId').optional().isString(),
    query('search').optional().isString()
  ],
  validateRequest,
  getAllComments
);

/**
 * GET /api/moderator/users
 * Get all users with filtering and pagination
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 *   - role: string (USER, MODERATOR, ADMIN)
 *   - isActive: boolean
 *   - search: string (search in username/email/display_name)
 */
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['USER', 'MODERATOR', 'ADMIN']),
    query('isActive').optional().isBoolean(),
    query('search').optional().isString()
  ],
  validateRequest,
  getAllUsers
);

/**
 * GET /api/moderator/stats
 * Get moderation statistics for dashboard
 */
router.get(
  '/stats',
  getModerationStats
);


/**
 * DELETE /api/moderator/posts/:postId
 * Delete (soft delete) a post by ID
 */
router.delete(
  '/posts/:postId',
  [
    param('postId').isString().notEmpty()
  ],
  validateRequest,
  deletePost
);

/**
 * PATCH /api/moderator/posts/:postId/restore
 * Restore a deleted post
 */
router.patch(
  '/posts/:postId/restore',
  [
    param('postId').isString().notEmpty()
  ],
  validateRequest,
  restorePost
);

/**
 * POST /api/moderator/posts/:postId/notify
 * Send notification to post owner
 * Body: { message: string }
 */
router.post(
  '/posts/:postId/notify',
  [
    param('postId').isString().notEmpty(),
    body('message').isString().trim().isLength({ min: 1, max: 500 })
  ],
  validateRequest,
  notifyUser
);

router.post(
  '/users/:userId/notify-warned',
  [
    param('userId').isString().notEmpty(),
    body('message').isString().trim().isLength({ min: 1, max: 500 })
  ],
  validateRequest,
  notifyUserWarned 
);

/**
 * DELETE /api/moderator/comments/:commentId
 * Delete (soft delete) a comment by ID
 */
router.delete(
  '/comments/:commentId',
  [
    param('commentId').isString().notEmpty()
  ],
  validateRequest,
  deleteComment
);

/**
 * POST /api/moderator/users/:userId/warn
 * Warn a user with a reason
 * Body: { reason: string }
 */
router.post(
  '/users/:userId/warn',
  [
    param('userId').isString().notEmpty(),
    body('reason').isString().trim().isLength({ min: 1, max: 1000 })
  ],
  validateRequest,
  warnUser
);

/**
 * POST /api/moderator/users/:userId/ban
 * Ban a user with a reason
 * Body: { reason: string }
 */
router.post(
  '/users/:userId/ban',
  [
    param('userId').isString().notEmpty(),
    body('reason').isString().trim().isLength({ min: 1, max: 1000 })
  ],
  validateRequest,
  banUser
);

/**
 * POST /api/moderator/users/:userId/unban
 * Unban a user (set is_active=true)
 */
router.post(
  '/users/:userId/unban',
  [
    param('userId').isString().notEmpty()
  ],
  validateRequest,
  unbanUser
);

export default router;