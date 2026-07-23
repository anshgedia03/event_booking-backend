import { Router } from 'express';
import { register, login, changePassword } from '../controllers/auth.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user — returns accessToken (15m) + refreshToken (30d)
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change the authenticated user's password
 * @access  Private (Requires valid access token)
 */
router.patch('/change-password', authenticate, changePassword);

export default router;

