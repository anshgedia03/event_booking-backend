import type { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

/**
 * @description GET /api/profile
 * Get the authenticated user's profile information.
 *
 * @access  Protected — requires valid JWT
 */
export const getProfileController = async (
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

    // Fetch user from DB, only selecting name and email
    const user = await User.findById(userId).select('name email');

    if (!user) {
      next(new ApiError(404, 'User profile not found'));
      return;
    }

    res.status(200).json(new ApiResponse(200, 'User profile retrieved successfully', user));
  } catch (error) {
    next(error);
  }
};
