import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createPost, getPost, listPosts, getLatestPosts } from '../controllers/postsController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/',
  [
    body('userId').isString().isLength({ min: 36, max: 36 }),
    body('title').isString().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('cookTime').optional().isInt({ min: 0 }),
    body('servings').optional().isInt({ min: 1 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    body('coverImageUrl').optional().isString(),
    body('ingredients').optional().isArray(),
    body('steps').optional().isArray()
  ],
  validateRequest,
  createPost
);

router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  listPosts
);

router.get(
  '/latest',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('details').optional().isBoolean()
  ],
  validateRequest,
  getLatestPosts
);

router.get(
  '/:id',
  [param('id').isString().isLength({ min: 1, max: 32 })],
  validateRequest,
  getPost
);

export default router;
