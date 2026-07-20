import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import ApiError from '../utils/ApiError';

/**
 * Extend Express Request to carry the authenticated userId
 * after the token has been verified.
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * authenticate middleware
 *
 * Expects:  Authorization: Bearer <accessToken>
 * On success: attaches req.userId and calls next()
 * On failure: passes an ApiError(401) to the global error handler
 */
const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(
        401,
        'Authentication required. Please log in to continue.',
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Access token is missing.');
    }

    // Verify signature and expiry — throws ApiError on failure
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
