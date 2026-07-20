import jwt, { SignOptions } from 'jsonwebtoken';
import ApiError from './ApiError';

export interface JwtPayload {
  userId: string;
}

// ─── Guard: fail fast if secrets are missing ─────────────────────────────────
const getSecret = (key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const secret = process.env[key];
  if (!secret) {
    throw new ApiError(500, `${key} is not defined in environment variables`);
  }
  return secret;
};

/**
 * @description Generate an access token (short-lived)
 */
export const generateAccessToken = (userId: string): string => {
  const secret = getSecret('JWT_ACCESS_SECRET');
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'];
  return jwt.sign({ userId } satisfies JwtPayload, secret, { expiresIn });
};

/**
 * @description Generate a refresh token (long-lived)
 */
export const generateRefreshToken = (userId: string): string => {
  const secret = getSecret('JWT_REFRESH_SECRET');
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as SignOptions['expiresIn'];
  return jwt.sign({ userId } satisfies JwtPayload, secret, { expiresIn });
};

/**
 * @description Verify an access token
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as JwtPayload;
  } catch {
    throw new ApiError(401, 'Access token is invalid or expired');
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as JwtPayload;
  } catch {
    throw new ApiError(401, 'Refresh token is invalid or expired');
  }
};
