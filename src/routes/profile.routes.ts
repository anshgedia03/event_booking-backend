import { Router } from 'express';
import { getProfileController, updateFCMTokenController } from '../controllers/profile.controller';
import authenticate from '../middlewares/authenticate';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Standard rate limit for profile actions (10 requests, refill 1 per 10 seconds)
const profileLimiter = rateLimiter('profile', {
  capacity: 10,
  refillRate: 1,
  refillIntervalMs: 10 * 1000,
});

/**
 * @route   GET /api/profile
 * @desc    Get the authenticated user's profile
 * @access  Protected (JWT required)
 */
router.get('/', authenticate, profileLimiter, getProfileController);

/**
 * @route   PUT /api/profile/fcm-token
 * @desc    Update user FCM device token
 * @access  Protected (JWT required)
 */
router.put('/fcm-token', authenticate, profileLimiter, updateFCMTokenController);

export default router;
