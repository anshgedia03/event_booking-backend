import { Router } from 'express';
import { register, login, changePassword, googleLogin } from '../controllers/auth.controller';
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

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate user via Google OAuth
 * @access  Public
 */
router.post('/google', googleLogin);

export default router;

