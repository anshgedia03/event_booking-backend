import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import type { RegisterInput, LoginInput } from '../validations/auth.validation';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils';

export interface RegisterResult {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

/**
 * @description Register a new user.
 * - Checks for duplicate emails (case-insensitive, handled by lowercase in schema)
 * - Creates and persists the user (password hashing via pre-save hook in model)
 * - Returns sanitized user object (no password)
 */
export const registerUser = async (
  input: RegisterInput,
): Promise<RegisterResult> => {
  const { name, email, password } = input;

  // 1. Check if a user with this email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(
      409,
      'An account with this email already exists. Please use a different email or log in.',
    );
  }

  // 2. Create the new user (password hashed automatically via pre-save hook)
  const newUser = await User.create({ name, email, password });

  // 3. Return only safe fields (no password)
  return {
    _id: (newUser._id as { toString(): string }).toString(),
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt,
  };
};

/**
 * @description Login an existing user.
 *
 * Security notes:
 * - Uses `.select('+password')` to explicitly opt-in to the hidden password field
 * - Returns the SAME generic 401 for both "user not found" and "wrong password"
 *   to prevent user enumeration attacks
 * - Tokens are signed with separate secrets so access/refresh can be revoked independently
 */
export const loginUser = async (input: LoginInput): Promise<LoginResult> => {
  const { email, password } = input;

  // 1. Find user — explicitly re-include password (it has select:false on schema)
  const user = await User.findOne({ email }).select('+password');

  // 2. Generic error for both "not found" and "wrong password" (anti-enumeration)
  const INVALID_CREDENTIALS = 'Invalid email or password';
  if (!user) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  // 3. Timing-safe password comparison via bcrypt
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  // 4. Generate token pair
  const userId = (user._id as { toString(): string }).toString();
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // 5. Return tokens + sanitized user (never expose password)
  return {
    accessToken,
    refreshToken,
    user: {
      _id: userId,
      name: user.name,
      email: user.email,
    },
  };
};

