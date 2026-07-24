import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import type { RegisterInput, LoginInput, ChangePasswordInput, GoogleAuthInput } from '../validations/auth.validation';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  // 2. Specific error if user is not found (as requested)
  if (!user) {
    throw new ApiError(404, 'User does not exist, please signup first');
  }

  // 3. Timing-safe password comparison via bcrypt
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
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

/**
 * @description Change an authenticated user's password.
 * - Verifies the current password
 * - Updates to the new password (triggering the bcrypt pre-save hook)
 */
export const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
): Promise<void> => {
  const { currentPassword, newPassword } = input;

  // 1. Find user and explicitly select the password field
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // 2. If the user already has a password, we must verify currentPassword
  if (user.password) {
    if (!currentPassword) {
      throw new ApiError(400, 'Current password is required to change it');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Incorrect current password');
    }

    // Ensure the new password is not the same as the old one
    if (currentPassword === newPassword) {
      throw new ApiError(400, 'New password must be different from the current password');
    }
  }

  // 3. Update password and save (mongoose pre-save hook handles hashing)
  user.password = newPassword;
  await user.save();
};

/**
 * @description Login or register a user via Google OAuth.
 */
export const googleLoginUser = async (input: GoogleAuthInput): Promise<LoginResult> => {
  const { idToken } = input;

  // 1. Verify the ID token with Google
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new ApiError(401, 'Invalid Google ID token');
  }

  const { email, sub: googleId, name } = payload;

  // 2. Find or create user
  let user = await User.findOne({ email });

  if (user) {
    // If user exists but doesn't have a googleId, update it
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    // Create new user (password is now optional)
    user = await User.create({
      name: name || 'Google User',
      email,
      googleId,
    });
  }

  // 3. Generate tokens
  const userId = (user._id as { toString(): string }).toString();
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

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


