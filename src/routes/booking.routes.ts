import { Router } from 'express';
import { 
  createBookingController, 
  getUserBookingsController, 
  getBookingDetailsController, 
  cancelBookingController, 
  getDigitalTicketController 
} from '../controllers/booking.controller';
import authenticate from '../middlewares/authenticate';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Strict limit for creating/canceling bookings (3 requests per 30 seconds)
const bookingActionLimiter = rateLimiter('booking_action', {
  capacity: 5,
  refillRate: 1,
  refillIntervalMs: 30 * 1000,
});

// Relaxed limit for fetching booking info
const bookingReadLimiter = rateLimiter('booking_read', {
  capacity: 20,
  refillRate: 2,
  refillIntervalMs: 1000,
});

/**
 * @route   GET /api/bookings/:id/ticket
 * @desc    Get a digital SVG ticket image for a specific booking
 * @access  Public (No JWT required)
 */
router.get('/:id/ticket', bookingReadLimiter, getDigitalTicketController);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking for the authenticated user
 * @access  Protected (JWT required)


/**
 * @route   GET /api/bookings
 * @desc    Get all bookings for the authenticated user (paginated & filtered)
 * @access  Protected (JWT required)
 */
router.get('/', authenticate, bookingReadLimiter, getUserBookingsController);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get details for a specific booking
 * @access  Protected (JWT required)
 */
router.get('/:id', authenticate, bookingReadLimiter, getBookingDetailsController);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a specific booking
 * @access  Protected (JWT required)
 */
router.delete('/:id', authenticate, bookingActionLimiter, cancelBookingController);

export default router;
