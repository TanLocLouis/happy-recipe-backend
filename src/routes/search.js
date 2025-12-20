import { Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { searchPosts } from '../controllers/searchController.js';

const router = Router();

router.get(
  '/results',
  [
    query('query').trim().notEmpty().withMessage('Search query is required').isLength({ max: 255 })
  ],
  validateRequest,
  searchPosts
);

export default router;
