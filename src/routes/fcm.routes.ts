import { Router } from 'express';
import { notifyUsersController } from '../controllers/fcm.controller';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

const fcmLimiter = rateLimiter('fcm_notify', {
  capacity: 10,
  refillRate: 2,
  refillIntervalMs: 1000,
});

/**
 * @route   POST /api/fcm/notify-users
 * @desc    Send custom push notification (title, message, image) to users
 * @access  Public / Admin
 */
router.post('/notify-users', fcmLimiter, notifyUsersController);

export default router;
