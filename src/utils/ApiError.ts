/**
 * Custom API Error class for consistent error throwing throughout the app.
 * Extends the native Error to add statusCode and structured error details.
 */
class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: Record<string, string>[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errors: Record<string, string>[] = [],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export default ApiError;
