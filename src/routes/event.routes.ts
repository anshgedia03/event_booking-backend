import { Router } from 'express';
import { getEvents, getEventDetails } from '../controllers/event.controller';
import authenticate from '../middlewares/authenticate';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// High capacity limit for public event fetching (100 requests, refill 20 per second)
const eventLimiter = rateLimiter('events', {
  capacity: 50,
  refillRate: 5,
  refillIntervalMs: 1000,
});

const eventDetailLimiter = rateLimiter('event-details', {
  capacity: 15,
  refillRate: 3,
  refillIntervalMs: 1000,
});

/**
 * @route   GET /api/events
 * @desc    Get all events (paginated)
 * @access  Public
 */
router.get('/', eventLimiter, getEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get full details of a specific event
 * @access  Protected (JWT required)
 */
router.get('/:id', authenticate, eventDetailLimiter, getEventDetails);

export default router;

