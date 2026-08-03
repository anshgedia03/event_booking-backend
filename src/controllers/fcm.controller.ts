import type { Request, Response, NextFunction } from 'express';
import { sendFCMNotification } from '../services/notification.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

/**
 * @description POST /api/fcm/notify-users
 * Send custom push notification with title, message, and image to users
 */
export const notifyUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, message, image, userIds, data } = req.body;

    if (!title || !message) {
      next(new ApiError(400, 'Title and message are required fields.'));
      return;
    }

    const result = await sendFCMNotification({
      title,
      message,
      image,
      userIds,
      data,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result.message, result));
  } catch (error) {
    next(error);
  }
};
