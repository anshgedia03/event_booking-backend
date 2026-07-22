import { Router } from 'express';
import {
  createPaymentOrderController,
  verifyPaymentController,
} from '../controllers/payment.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay order for an authenticated event booking
 * @access  Protected (JWT required)
 */
router.post('/create-order', authenticate, createPaymentOrderController);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment signature and confirm booking
 * @access  Protected (JWT required)
 */
router.post('/verify', authenticate, verifyPaymentController);

export default router;
