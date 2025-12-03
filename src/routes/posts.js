import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createPost, getPostByID, listPosts, getLatestPosts, discoverPosts, updateReaction, updateBookmark } from '../controllers/postsController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import path from 'path';
import cors from 'cors';

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
  [param('id').isString().isLength({ min: 1, max: 32 })],
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

router.post(
  '/reaction',
  [
    body('postId').isString().isLength({ min: 1, max: 36 }),
    body('reaction').optional({ nullable: true, checkFalsy: true }).isIn(['like', 'heart', 'yum', null]).withMessage('Reaction must be like, heart, yum, or null')
  ],
  validateRequest,
  updateReaction
);

router.post(
  '/bookmark',
  [
    body('postId').isString().isLength({ min: 1, max: 36 }),
    body('bookmark').isBoolean()
  ],
  validateRequest,
  updateBookmark
);

export default router;
