import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  createPost,
  createPostWithUpload,
  getPostByID,
  listPosts,
  getLatestPosts,
  discoverPosts,
  getPostComments,
  createPostComment,
  getRelatedPosts,
  deletePost,
} from "../controllers/postsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { uploadPostImages } from "../middleware/upload.js";
import path from "path";
import cors from "cors";

const router = Router();

router.delete("/:id", authenticate, deletePost);

// New endpoint for file upload with multipart/form-data
router.post(
  "/",
  authenticate, // Require authentication
  uploadPostImages, // Handle file uploads
  createPostWithUpload
);

// Legacy endpoint for JSON-only post creation (kept for backward compatibility)
router.post(
  "/json",
  authenticate,
  [
    body("title").isString().isLength({ min: 1, max: 255 }),
    body("description").optional().isString(),
    body("cookTime").optional().isInt({ min: 0 }),
    body("servings").optional().isInt({ min: 1 }),
    body("difficulty").optional().isIn(["easy", "medium", "hard"]),
    body("coverImageUrl").optional().isString(),
    body("ingredients").optional().isArray(),
    body("steps").optional().isArray(),
  ],
  validateRequest,
  createPost
);

router.get(
  "/all",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  listPosts
);

router.get(
  "/discover",
  optionalAuthenticate, // Optional authentication for user-specific actions
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  discoverPosts
);

router.get(
  "/latest",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
    query("details").optional().isBoolean(),
  ],
  validateRequest,
  getLatestPosts
);

router.get(
  "/:id",
  optionalAuthenticate, // Optional authentication for user-specific actions
  [param("id").isString().isLength({ min: 1, max: 36 })],
  validateRequest,
  getPostByID
);

router.get(
  "/:id/comments",
  optionalAuthenticate,
  [
    param("id").isString().isLength({ min: 1, max: 36 }),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  getPostComments
);

router.post(
  "/:id/comments",
  authenticate,
  [
    param("id").isString().isLength({ min: 1, max: 36 }),
    body("content").isString().isLength({ min: 1, max: 1000 }),
  ],
  validateRequest,
  createPostComment
);

// Handle get coverImageUrl separately if needed
router.get("/files/:filename", cors(), (req, res) => {
  const filename = req.params.filename;
  const filePath = path.resolve("uploads", filename);

  // Let Express infer the correct Content-Type based on extension
  return res.sendFile(filePath);
  // return res.status(200).json( { coverImageUrl: filePath } )
});

router.get(
  "/all",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  listPosts
);

router.get(
  "/related/:id",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  getRelatedPosts
);

export default router;
