import type { Request, Response, NextFunction } from 'express';
import { createBookingSchema, getUserBookingsQuerySchema } from '../validations/booking.validation';
import { createBooking, getUserBookings, getBookingById, cancelBooking } from '../services/booking.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

/**
 * @description POST /api/bookings
 * Create a booking for the authenticated user.
 *
 * @access  Protected — requires valid JWT
 */
export const createBookingController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // userId is guaranteed to be set by the authenticate middleware
    const userId = req.userId;
    if (!userId) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    // 1. Validate request body
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    // 2. Delegate to service (event check, seat deduction, user update all atomic)
    const booking = await createBooking(userId, parsed.data);

    // 3. Respond with 201 Created
    res
      .status(201)
      .json(new ApiResponse(201, 'Booking confirmed successfully', booking));
  } catch (error) {
    next(error);
  }
};

/**
 * @description GET /api/bookings
 * Get all bookings for the authenticated user with optional status filter.
 *
 * Query params:
 *   status - 'upcoming', 'past', or 'all' (default: 'all')
 *   page   - page number (default: 1)
 *   limit  - items per page (default: 10)
 *
 * @access  Protected — requires valid JWT
 */
export const getUserBookingsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    // 1. Validate and coerce query params
    const parsed = getUserBookingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'query',
        message: issue.message,
      }));
      next(new ApiError(400, 'Invalid query parameters', errors));
      return;
    }

    // 2. Query bookings from service
    const result = await getUserBookings(userId, parsed.data);

    // 3. Return bookings + pagination metadata
    res
      .status(200)
      .json(new ApiResponse(200, 'User bookings retrieved successfully', result));
  } catch (error) {
    next(error);
  }
};

/**
 * @description GET /api/bookings/:id
 * Get details for a specific booking.
 *
 * @access  Protected — requires valid JWT and user ownership
 */
export const getBookingDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.userId;
    const bookingId = req.params['id'] as string;

    if (!userId) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    const booking = await getBookingById(userId, bookingId);

    res
      .status(200)
      .json(new ApiResponse(200, 'Booking details retrieved successfully', booking));
  } catch (error) {
    next(error);
  }
};

/**
 * @description DELETE /api/bookings/:id
 * Cancel a specific booking and restore available seats.
 *
 * @access  Protected — requires valid JWT and user ownership
 */
export const cancelBookingController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.userId;
    const bookingId = req.params['id'] as string;

    if (!userId) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    const booking = await cancelBooking(userId, bookingId);

    res
      .status(200)
      .json(new ApiResponse(200, 'Booking cancelled successfully', booking));
  } catch (error) {
    next(error);
  }
};
