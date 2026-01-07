import { Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { searchPosts } from '../controllers/searchController.js';

const router = Router();

router.get(
  '/results',
  [
    query('category').trim().notEmpty().isIn(['user', 'post']).withMessage('Category must be either "user" or "post"'),
    query('query').trim().notEmpty().withMessage('Search query is required').isLength({ max: 255 }),
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer')
  ],
  validateRequest,
  searchPosts
);

export default router;
