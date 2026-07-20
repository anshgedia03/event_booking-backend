import { Router } from 'express';
import { getEvents, getEventDetails } from '../controllers/event.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

/**
 * @route   GET /api/events
 * @desc    Get all events (paginated)
 * @access  Public
 */
router.get('/', getEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get full details of a specific event
 * @access  Protected (JWT required)
 */
router.get('/:id', authenticate, getEventDetails);

export default router;

