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

    // Fetch user from DB, including password so we can check if it exists
    const user = await User.findById(userId).select('name email +password');

    if (!user) {
      next(new ApiError(404, 'User profile not found'));
      return;
    }

    const hasPassword = !!user.password;

    res.status(200).json(
      new ApiResponse(200, 'User profile retrieved successfully', {
        _id: user._id,
        name: user.name,
        email: user.email,
        hasPassword,
      }),
    );
  } catch (error) {
    next(error);
  }
};
