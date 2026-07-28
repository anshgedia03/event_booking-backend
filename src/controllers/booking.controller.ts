import type { Request, Response, NextFunction } from 'express';
import { createBookingSchema, getUserBookingsQuerySchema } from '../validations/booking.validation';
import { createBooking, getUserBookings, getBookingById, cancelBooking, getPublicBookingById } from '../services/booking.service';
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

/**
 * @description GET /api/bookings/:id/ticket
 * Render a beautiful, dynamic SVG digital ticket for the booking.
 *
 * @access  Public (So security guards can scan and view without logging in)
 */
export const getDigitalTicketController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const bookingId = req.params['id'] as string;
    const booking = await getPublicBookingById(bookingId);
    
    if (!booking || !booking.eventId) {
      res.status(404).send('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="40" font-family="Arial" font-size="20" fill="red">Ticket Not Found</text></svg>');
      return;
    }

    const event: any = booking.eventId;
    
    const svgWidth = 400;
    const svgHeight = 650;
    
    // Status color logic
    const isCancelled = booking.status === 'cancelled';
    const statusColor = isCancelled ? '#EF4444' : '#10B981'; // Red or Emerald
    const statusText = isCancelled ? 'CANCELLED' : 'CONFIRMED';
    
    // Helper to escape XML special characters
    const escapeXml = (unsafe: string) => {
      if (!unsafe) return '';
      return unsafe.toString().replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case "'": return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const title1 = escapeXml(event.title?.substring(0, 22) || 'Event Ticket');
    const title2 = escapeXml(event.title?.length > 22 ? event.title.substring(22, 44) + (event.title.length > 44 ? '...' : '') : '');
    const titleSuffix = event.title?.length > 22 && !title2 ? '...' : ''; // Handle edge case

    const venueStr = escapeXml(event.venue || 'TBA');
    const organizerStr = escapeXml(event.organizer || 'Evently Verified');
    const dateStr = escapeXml(event.date ? new Date(event.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA');
    
    // Generate beautiful HTML/CSS Digital Ticket
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Ticket - ${escapeXml(event.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background-color: #f3f4f6;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    .ticket-wrapper {
      width: 100%;
      max-width: 400px;
      filter: drop-shadow(0 15px 35px rgba(42, 28, 164, 0.12));
    }
    .ticket-top {
      background: linear-gradient(135deg, #5D4CE9 0%, #2A1CA4 100%);
      padding: 36px 28px;
      border-radius: 24px 24px 0 0;
      color: white;
      position: relative;
    }
    .ticket-bottom {
      background: #ffffff;
      padding: 36px 28px;
      border-radius: 0 0 24px 24px;
      position: relative;
    }
    /* Ticket Cutouts */
    .ticket-top::after, .ticket-bottom::before {
      content: ''; position: absolute; width: 40px; height: 40px;
      background-color: #f3f4f6; border-radius: 50%; z-index: 10;
    }
    .ticket-top::after { bottom: -20px; left: -20px; }
    .ticket-bottom::before { top: -20px; left: -20px; }
    
    .ticket-top::before {
      content: ''; position: absolute; width: 40px; height: 40px;
      background-color: #f3f4f6; border-radius: 50%;
      bottom: -20px; right: -20px; z-index: 10;
    }
    .ticket-bottom::after {
      content: ''; position: absolute; width: 40px; height: 40px;
      background-color: #f3f4f6; border-radius: 50%;
      top: -20px; right: -20px; z-index: 10;
    }
    /* Dashed line */
    .divider {
      position: absolute; bottom: 0; left: 20px; right: 20px;
      height: 2px; border-bottom: 3px dashed rgba(255, 255, 255, 0.3);
      z-index: 5;
    }
    
    /* Typography */
    .label {
      font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;
      color: #E0E7FF; margin-bottom: 8px; font-weight: 700;
    }
    .title {
      font-size: 28px; font-weight: 800; line-height: 1.25;
      margin-bottom: 24px; color: #ffffff;
    }
    .status-pill {
      display: inline-block; padding: 8px 16px; border-radius: 10px;
      font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
    }
    .status-confirmed { background-color: rgba(16, 185, 129, 0.2); color: #10B981; border: 1.5px solid #10B981; }
    .status-cancelled { background-color: rgba(239, 68, 68, 0.2); color: #EF4444; border: 1.5px solid #EF4444; }
    
    .info-row { margin-bottom: 24px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label {
      font-size: 13px; color: #6B7280; text-transform: uppercase;
      letter-spacing: 0.5px; font-weight: 600; margin-bottom: 6px;
    }
    .info-value { font-size: 18px; color: #111827; font-weight: 700; line-height: 1.4; }
    
    .flex-row {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 2px solid #F3F4F6; padding-top: 24px; margin-top: 32px;
    }
    .price-value { font-size: 28px; font-weight: 800; color: #111827; }
    .tickets-value { font-size: 28px; font-weight: 800; color: #5D4CE9; }
  </style>
</head>
<body>
  <div class="ticket-wrapper">
    <div class="ticket-top">
      <div class="label">Evently Digital Ticket</div>
      <div class="title">${escapeXml(event.title || 'Event Ticket')}</div>
      <div class="status-pill status-${booking.status}">${statusText}</div>
      <div class="divider"></div>
    </div>
    <div class="ticket-bottom">
      <div class="info-row">
        <div class="info-label">Booking ID</div>
        <div class="info-value" style="font-family: monospace; font-size: 16px; letter-spacing: 0.5px;">${booking._id}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Date & Time</div>
        <div class="info-value">${dateStr}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Venue</div>
        <div class="info-value">${venueStr}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Organizer</div>
        <div class="info-value">${organizerStr}</div>
      </div>
      
      <div class="flex-row">
        <div>
          <div class="info-label">Tickets</div>
          <div class="tickets-value">${booking.tickets}</div>
        </div>
        <div style="text-align: right;">
          <div class="info-label">Total Paid</div>
          <div class="price-value">${booking.totalAmount ? '₹' + booking.totalAmount.toLocaleString('en-IN') : 'Free'}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'public, max-age=60'); // Cache for 60 seconds
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};
