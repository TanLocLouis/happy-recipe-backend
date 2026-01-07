import { Router } from 'express';
import { getUserProfile } from '../controllers/usersController.js';

const router = Router();

// GET /api/users/:user_id - Get user profile info for browsing
router.get('/:user_id', getUserProfile);

export default router;
