import mongoose from 'mongoose';
import Booking, { IBooking } from '../models/booking.model';
import Event from '../models/event.model';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import type { CreateBookingInput } from '../validations/booking.validation';

/**
 * @description Create a new booking.
 *
 * Steps:
 *  1. Verify the event exists and has enough available seats
 *  2. Calculate totalAmount = tickets × event.price
 *  3. Create the booking (status: 'confirmed')
 *  4. Decrement event.availableSeats atomically
 *  5. Push the booking._id into user.bookings[]
 *
 * All DB writes happen in a session transaction to keep data consistent.
 */
export const createBooking = async (
  userId: string,
  input: CreateBookingInput,
): Promise<IBooking> => {
  const { eventId, tickets, contactNumber } = input;

  // ── 1. Fetch event ───────────────────────────────────────────────────────────
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  // ── 2. Check seat availability ───────────────────────────────────────────────
  const available = event.availableSeats ?? 0;
  if (available < tickets) {
    throw new ApiError(
      400,
      `Only ${available} seat${available === 1 ? '' : 's'} available for this event`,
    );
  }

  // ── 3. Check user's total tickets for this event ─────────────────────────────
  const existingBookings = await Booking.find({ userId, eventId, status: 'confirmed' });
  const alreadyBookedTickets = existingBookings.reduce((sum, b) => sum + b.tickets, 0);

  if (alreadyBookedTickets + tickets > 5) {
    throw new ApiError(
      400,
      `You have already booked ${alreadyBookedTickets} tickets for this event. You can only book a maximum of 5 tickets per event.`,
    );
  }

  // ── 4. Calculate total amount ────────────────────────────────────────────────
  const totalAmount = (event.price ?? 0) * tickets;

  // ── 5. Use a MongoDB session for atomic writes ───────────────────────────────
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Create booking document
    const [booking] = await Booking.create(
      [
        {
          userId: new mongoose.Types.ObjectId(userId),
          eventId: new mongoose.Types.ObjectId(eventId),
          tickets,
          contactNumber,
          totalAmount,
          status: 'confirmed',
        },
      ],
      { session },
    );

    // Decrement available seats atomically (prevents over-booking)
    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { availableSeats: -tickets } },
      { session },
    );

    // Push booking reference into user's bookings array
    await User.findByIdAndUpdate(
      userId,
      { $push: { bookings: booking._id } },
      { session },
    );

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export interface PaginatedBookings {
  bookings: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * @description Retrieve paginated bookings for a user.
 * Supports filtering by status ('upcoming', 'past', 'all').
 */
export const getUserBookings = async (
  userId: string,
  query: import('../validations/booking.validation').GetUserBookingsQuery
): Promise<PaginatedBookings> => {
  const { status, page, limit } = query;
  const skip = (page - 1) * limit;
  const now = new Date();

  // Base match for the user
  const matchStage: any = { userId: new mongoose.Types.ObjectId(userId) };

  // Aggregation pipeline to join with Event collection
  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'events', // MongoDB collection name is lowercase, pluralized by default
        localField: 'eventId',
        foreignField: '_id',
        as: 'event',
      },
    },
    { $unwind: '$event' }, // Flatten the event array
  ];

  // Add status filter based on event date
  if (status === 'upcoming') {
    pipeline.push({ $match: { 'event.date': { $gte: now } } });
  } else if (status === 'past') {
    pipeline.push({ $match: { 'event.date': { $lt: now } } });
  }

  // Sort: upcoming -> earliest first, past -> most recent first, all -> most recent first
  const sortStage = status === 'upcoming' ? { 'event.date': 1 } : { 'event.date': -1 };
  pipeline.push({ $sort: sortStage });

  // Use $facet to run data retrieval and count in parallel
  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  });

  const [result] = await Booking.aggregate(pipeline);

  const total = result.metadata[0]?.total || 0;
  const bookings = result.data;
  const totalPages = Math.ceil(total / limit);

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * @description Retrieve a specific booking by its ID.
 * Ensures that the booking belongs to the requesting user.
 */
export const getBookingById = async (
  userId: string,
  bookingId: string
): Promise<IBooking | null> => {
  // Validate ObjectId to prevent CastError
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, `'${bookingId}' is not a valid booking ID`);
  }

  // Fetch the booking and verify it belongs to the authenticated user
  const booking = await Booking.findOne({
    _id: bookingId,
    userId: new mongoose.Types.ObjectId(userId),
  }).populate('eventId'); // Populate event details

  if (!booking) {
    throw new ApiError(404, 'Booking not found or you do not have permission to view it');
  }

  return booking;
};

/**
 * @description Retrieve a specific booking by its ID for public digital ticket rendering.
 */
export const getPublicBookingById = async (
  bookingId: string
): Promise<IBooking | null> => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, `'${bookingId}' is not a valid booking ID`);
  }

  const booking = await Booking.findById(bookingId).populate('eventId');
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  return booking;
};

/**
 * @description Cancel a booking (Soft delete by changing status to 'cancelled').
 *
 * Steps:
 *  1. Verify the booking exists, belongs to the user, and is 'confirmed'
 *  2. Change booking status to 'cancelled'
 *  3. Increment event.availableSeats by the number of tickets cancelled
 *
 * Uses a MongoDB session transaction for atomic updates.
 */
export const cancelBooking = async (
  userId: string,
  bookingId: string
): Promise<IBooking> => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, `'${bookingId}' is not a valid booking ID`);
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Fetch booking inside transaction
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: new mongoose.Types.ObjectId(userId),
    }).session(session);

    if (!booking) {
      throw new ApiError(404, 'Booking not found or you do not have permission to cancel it');
    }

    if (booking.status === 'cancelled') {
      throw new ApiError(400, 'This booking is already cancelled');
    }

    // 2. Fetch the linked event to validate the cancellation window
    const event = await Event.findById(booking.eventId).session(session);
    if (!event) {
      throw new ApiError(404, 'The event linked to this booking could not be found');
    }

    // Block cancellation if the event date has already passed
    if (event.date && event.date < new Date()) {
      throw new ApiError(
        400,
        'This event has already taken place. Cancellations are not allowed for past events.',
      );
    }

    // 3. Mark as cancelled
    booking.status = 'cancelled';
    await booking.save({ session });

    // 3. Restore available seats for the event
    await Event.findByIdAndUpdate(
      booking.eventId,
      { $inc: { availableSeats: booking.tickets } },
      { session }
    );

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
