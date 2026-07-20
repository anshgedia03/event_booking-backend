import { Router } from 'express';
import { createBookingController, getUserBookingsController, getBookingDetailsController, cancelBookingController } from '../controllers/booking.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking for the authenticated user
 * @access  Protected (JWT required)
 */
router.post('/', authenticate, createBookingController);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings for the authenticated user (paginated & filtered)
 * @access  Protected (JWT required)
 */
router.get('/', authenticate, getUserBookingsController);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get details for a specific booking
 * @access  Protected (JWT required)
 */
router.get('/:id', authenticate, getBookingDetailsController);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a specific booking
 * @access  Protected (JWT required)
 */
router.delete('/:id', authenticate, cancelBookingController);

export default router;
