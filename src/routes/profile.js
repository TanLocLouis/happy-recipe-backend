import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { listBookmarks, listUserPosts, editProfile } from '../controllers/profileController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get(
  '/:userId/bookmarks',
  // authenticate, // No need to authenticate for listing bookmarks
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  listBookmarks
);

router.get(
  '/:userId/posts',
  // authenticate, // Optional: enable if you need viewer-specific actions
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  listUserPosts
);

router.post(
  '/edit',
  upload.single("avatar"),
  authenticate,
  [
    body('displayName').optional().isString().isLength({ max: 100 }),
    body('bio').optional().isString().isLength({ max: 1000 })
  ],
  validateRequest,
  editProfile
);

export default router;