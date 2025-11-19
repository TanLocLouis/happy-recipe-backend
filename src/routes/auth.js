import { Router } from 'express';
import { body } from 'express-validator';
import { signup, login, validate2FA, requestNewAccessToken, getUserInfo } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/signup',
  [
    body('firstName').optional().isString().isLength({ max: 100 }),
    body('lastName').optional().isString().isLength({ max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 }),
  ],
  validateRequest,
  signup
);

router.post('/test', (req, res) => {
  console.log("Test endpoint hit");
  console.log(req.body);
  return res.status(200).json( {message: "test-ok"});
})

router.post(
  '/login',
  [
    body('email').isString().isLength({ min: 3 }).trim(),
    body('password').isString().isLength({ min: 8 })
  ],
  validateRequest,
  login
);

router.post(
  '/validate/2fa', 
  [
    // body('tempToken').isString().isLength({ min: 10 }),
  ],
  validateRequest,
  validate2FA
)

router.post(
  '/token',
  [
    body('refreshToken').optional().isString()
  ],
  validateRequest,
  requestNewAccessToken
);

router.post(
  '/userinfo',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 })
  ],
  validateRequest,
  getUserInfo
);

export default router;

