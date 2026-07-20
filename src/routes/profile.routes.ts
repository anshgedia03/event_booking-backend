import { Router } from 'express';
import { getProfileController } from '../controllers/profile.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

/**
 * @route   GET /api/profile
 * @desc    Get the authenticated user's profile
 * @access  Protected (JWT required)
 */
router.get('/', authenticate, getProfileController);

export default router;
