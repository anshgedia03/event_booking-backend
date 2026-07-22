import type { Request, Response, NextFunction } from 'express';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from '../validations/payment.validation';
import {
  createPaymentOrder,
  verifyPaymentAndCreateBooking,
} from '../services/payment.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

export const createPaymentOrderController = async (
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

    const parsed = createPaymentOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    const paymentOrder = await createPaymentOrder(userId, parsed.data);

    res
      .status(201)
      .json(new ApiResponse(201, 'Payment order created successfully', paymentOrder));
  } catch (error) {
    next(error);
  }
};

export const verifyPaymentController = async (
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

    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    const result = await verifyPaymentAndCreateBooking(userId, parsed.data);

    res
      .status(200)
      .json(new ApiResponse(200, 'Payment verified and booking confirmed', result));
  } catch (error) {
    next(error);
  }
};
