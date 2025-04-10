export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to create common errors
export const createError = {
  badRequest: (message: string) => new AppError(400, message),
  unauthorized: (message: string) => new AppError(401, message),
  forbidden: (message: string) => new AppError(403, message),
  notFound: (message: string) => new AppError(404, message),
  conflict: (message: string) => new AppError(409, message),
  internal: (message: string) => new AppError(500, message),
}; 