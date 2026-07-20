import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';

/**
 * Global Express error handler.
 * Must be registered LAST in the middleware chain (4 arguments).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // ── 1. Known operational error (thrown by us via ApiError) ──────────────
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(
      new ApiResponse(err.statusCode, err.message, {
        errors: err.errors,
      }),
    );
    return;
  }

  // ── 2. Zod validation error (safety net if not caught in controller) ────
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
    res
      .status(400)
      .json(new ApiResponse(400, 'Validation failed', { errors }));
    return;
  }

  // ── 3. Mongoose duplicate key error ─────────────────────────────────────
  if (
    err instanceof mongoose.mongo.MongoServerError &&
    (err as { code?: number }).code === 11000
  ) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue ?? {};
    const field = Object.keys(keyValue)[0] ?? 'field';
    res.status(409).json(
      new ApiResponse(409, `${field} already exists`, null),
    );
    return;
  }

  // ── 4. Mongoose validation error ────────────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    res
      .status(400)
      .json(new ApiResponse(400, 'Validation failed', { errors }));
    return;
  }

  // ── 5. Unknown / unexpected error ───────────────────────────────────────
  console.error('💥 Unhandled error:', err);
  res.status(500).json(new ApiResponse(500, 'Internal server error', null));
};

export default errorHandler;
