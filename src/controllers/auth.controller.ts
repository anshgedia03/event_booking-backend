import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { registerSchema, loginSchema, changePasswordSchema, googleAuthSchema } from '../validations/auth.validation';
import { registerUser, loginUser, changePassword as changePasswordService, googleLoginUser } from '../services/auth.service';
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

/**
 * @description PATCH /api/auth/change-password
 * Change the authenticated user's password.
 * Requires auth middleware to extract req.userId
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Ensure user is authenticated (req.userId is set by authenticate middleware)
    if (!req.userId) {
      next(new ApiError(401, 'Unauthorized access'));
      return;
    }

    // 2. Validate request body
    const parsed = changePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    // 3. Delegate to service layer
    await changePasswordService(req.userId, parsed.data);

    // 4. Return success response
    res.status(200).json(new ApiResponse(200, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @description POST /api/auth/google
 * Authenticate a user via Google ID Token and return an access + refresh token pair.
 */
export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Validate request body
    const parsed = googleAuthSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      next(new ApiError(400, 'Validation failed', errors));
      return;
    }

    // 2. Delegate to service (token verification + db lookup/creation)
    const result = await googleLoginUser(parsed.data);

    // 3. Return 200 with token pair + sanitized user
    res.status(200).json(new ApiResponse(200, 'Google login successful', result));
  } catch (error) {
    next(error);
  }
};
