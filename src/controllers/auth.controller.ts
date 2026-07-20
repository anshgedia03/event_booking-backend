import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema } from '../validations/auth.validation';
import { registerUser, loginUser } from '../services/auth.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

/**
 * @description POST /api/auth/register
 * Register a new user account.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Validate request body with Zod
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      // Map Zod v4 issues to a flat, readable errors array
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));

      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    // 2. Delegate to service layer
    const user = await registerUser(parsed.data);

    // 3. Respond with 201 Created
    res
      .status(201)
      .json(new ApiResponse(201, 'User registered successfully', user));
  } catch (error) {
    // Pass all errors (including ApiError from service) to global handler
    next(error);
  }
};

/**
 * @description POST /api/auth/login
 * Authenticate a user and return an access + refresh token pair.
 *
 * Mobile usage:
 *   - Store both tokens in Keychain (iOS) / EncryptedSharedPreferences (Android)
 *   - Send accessToken in every protected request: Authorization: Bearer <token>
 *   - Use refreshToken to silently renew the accessToken when it expires (15m)
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Validate request body
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    // 2. Delegate to service (credential check + token generation)
    const result = await loginUser(parsed.data);

    // 3. Return 200 with token pair + sanitized user
    res.status(200).json(new ApiResponse(200, 'Login successful', result));
  } catch (error) {
    next(error);
  }
};

