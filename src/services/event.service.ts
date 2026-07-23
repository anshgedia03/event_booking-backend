import Event, { IEvent } from '../models/event.model';
import type { GetEventsQuery } from '../validations/event.validation';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError';

export interface PaginatedEvents {
  events: IEvent[];
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
 * @description Retrieve events with pagination, optional category filter, and title search.
 *
 * - category='all' (or omitted) → no category filter, returns all categories
 * - page + limit → used for infinite scroll on the mobile client
 * - Sorted chronologically (date ascending)
 */
export const queryEvents = async (
  query: GetEventsQuery,
): Promise<PaginatedEvents> => {
  const filter: Record<string, any> = {};
  let sort: Record<string, 1 | -1> = { date: 1 };

  // 'all' is the client's way of saying "no category filter"
  if (query.category && query.category !== 'all') {
    filter.category = query.category;
  }

  if (query.search) {
    // Case-insensitive regex search on title
    filter.title = { $regex: query.search, $options: 'i' };
  }

  // Filter by date relative to the current moment
  const now = new Date();
  if (query.status === 'upcoming') {
    filter.date = { $gte: now };
  } else if (query.status === 'past') {
    filter.date = { $lt: now };
  }
  // 'all' (default) — no date filter applied

  if (query.sort === 'price_asc') {
    sort = { price: 1, date: 1 };
  } else if (query.sort === 'price_desc') {
    sort = { price: -1, date: 1 };
  }

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  // Run query + count in parallel for efficiency
  const [events, total] = await Promise.all([
    Event.find(filter).sort(sort).skip(skip).limit(limit),
    Event.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    events,
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
 * @description Get a single event by its MongoDB ObjectId.
 * Validates the id format before querying to avoid a Mongoose CastError.
 */
export const getEventById = async (id: string): Promise<IEvent> => {
  // Validate ObjectId format first — prevents CastError from reaching global handler
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `'${id}' is not a valid event ID`);
  }

  const event = await Event.findById(id);

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  return event;
};
