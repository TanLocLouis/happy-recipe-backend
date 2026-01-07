import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { chatAI, chatOpenAI } from '../controllers/aiController.js';

const router = Router();

// POST /api/ai/chat - Gemini AI chatbot search feature
router.post(
	'/chat-gemini',
	[
		body('chatList').isArray({ min: 1 }).withMessage('chatList must be a non-empty array'),
		body('chatList.*.role').isString().isIn(['user', 'assistant']).withMessage('role must be user or assistant'),
		body('chatList.*.content').isString().trim().notEmpty().withMessage('content must be non-empty string')
	],
	validateRequest,
	chatAI
);

// POST /api/ai/chat-openai - OpenAI chatbot search feature
router.post(
	'/chat',
	[
		body('chatList').isArray({ min: 1 }).withMessage('chatList must be a non-empty array'),
		body('chatList.*.role').isString().isIn(['user', 'assistant']).withMessage('role must be user or assistant'),
		body('chatList.*.content').isString().trim().notEmpty().withMessage('content must be non-empty string')
	],
	validateRequest,
	chatOpenAI
);

export default router;

