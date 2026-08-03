import { Router } from 'express';
import {
  register,
  login,
  changePassword,
  googleLogin,
  refreshToken,
} from '../controllers/auth.controller';
import authenticate from '../middlewares/authenticate';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Strict rate limit for auth endpoints to prevent brute-force (5 attempts, refill 1 every minute)
const authLimiter = rateLimiter('auth', {
  capacity: 5,
  refillRate: 1,
  refillIntervalMs: 60 * 1000,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user — returns accessToken (15m) + refreshToken (30d)
 * @access  Public
 */
router.post('/login', authLimiter, login);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Exchange a valid refresh token for a new access token
 * @access  Public
 */
router.post('/refresh-token', authLimiter, refreshToken);

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change the authenticated user's password
 * @access  Private (Requires valid access token)
 */
router.patch('/change-password', authenticate, authLimiter, changePassword);

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate user via Google OAuth
 * @access  Public
 */
router.post('/google', authLimiter, googleLogin);

export default router;
