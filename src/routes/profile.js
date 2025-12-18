import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { listBookmarks } from '../controllers/profileController.js';

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

export default router;