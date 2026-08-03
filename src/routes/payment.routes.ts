import { Router } from 'express';
import {
  createPaymentOrderController,
  verifyPaymentController,
} from '../controllers/payment.controller';
import authenticate from '../middlewares/authenticate';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Rate limit for payment interactions (50 tokens, refill 10 per second)
const paymentLimiter = rateLimiter('payments', {
  capacity: 15,
  refillRate: 3,
  refillIntervalMs: 1000,
});

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay order for an authenticated event booking
 * @access  Protected (JWT required)
 */
router.post('/create-order', authenticate, paymentLimiter, createPaymentOrderController);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment signature and confirm booking
 * @access  Protected (JWT required)
 */
router.post('/verify', authenticate, paymentLimiter, verifyPaymentController);

export default router;
