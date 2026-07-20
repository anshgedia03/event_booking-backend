import type { Request, Response, NextFunction } from 'express';
import { getEventsQuerySchema } from '../validations/event.validation';
import { queryEvents, getEventById } from '../services/event.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

/**
 * @description GET /api/events
 * Get paginated events with optional category filter and title search.
 *
 * Query params:
 *   category  – specific category or 'all' (default: all)
 *   search    – title substring search (case-insensitive)
 *   page      – page number, 1-indexed (default: 1)
 *   limit     – items per page (default: 6, max: 50)
 */
export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Validate and coerce query params
    const parsed = getEventsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'query',
        message: issue.message,
      }));
      next(new ApiError(400, 'Invalid query parameters', errors));
      return;
    }

    // 2. Query with pagination
    const result = await queryEvents(parsed.data);

    // 3. Return events + pagination metadata
    res
      .status(200)
      .json(new ApiResponse(200, 'Events retrieved successfully', result));
  } catch (error) {
    next(error);
  }
};

/**
 * @description GET /api/events/:id
 * Get full details of a single event.
 *
 * @access  Protected — requires valid JWT (Authorization: Bearer <token>)
 * req.userId is set by the authenticate middleware before this runs
 */
export const getEventDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const event = await getEventById(id);

    res
      .status(200)
      .json(new ApiResponse(200, 'Event details retrieved successfully', event));
  } catch (error) {
    next(error);
  }
};

