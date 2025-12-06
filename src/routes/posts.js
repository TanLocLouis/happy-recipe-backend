import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createPost, getPostByID, listPosts, getLatestPosts, discoverPosts } from '../controllers/postsController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import path from 'path';
import cors from 'cors';

const router = Router();

router.post(
  '/',
  authenticate, // Require authentication
  [
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
  '/all',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  listPosts
);

router.get(
  '/discover',
  optionalAuthenticate, // Optional authentication for user-specific actions
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  discoverPosts 
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
  optionalAuthenticate, // Optional authentication for user-specific actions
  [param('id').isString().isLength({ min: 1, max: 36 })],
  validateRequest,
  getPostByID
);

// Handle get coverImageUrl separately if needed
router.get("/files/:filename", cors(), (req, res) => {
  const filename = req.params.filename;
  const filePath = path.resolve("uploads", filename);

  res.setHeader("Content-Type", "image/jpeg");
  return res.sendFile(filePath);
  // return res.status(200).json( { coverImageUrl: filePath } )
});

export default router;
