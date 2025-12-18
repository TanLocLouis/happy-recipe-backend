import { Router } from 'express';
import { body } from 'express-validator';
import { uploadUserAction } from '../controllers/userActionController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post(
  '/user-action',
  authenticate, // Require authentication
  [
    body('action').isIn(['reaction', 'bookmark']).withMessage('action must be either "reaction" or "bookmark"'),
    body('postId').isString().isLength({ min: 1, max: 36 }),
    body('newReaction').optional({ nullable: true, checkFalsy: true }).isIn(['like', 'heart', 'yum', null]).withMessage('newReaction must be like, heart, yum, or null'),
    body('newBookmark').optional().isBoolean().withMessage('newBookmark must be a boolean value')
  ],
  validateRequest,
  uploadUserAction
);

export default router;