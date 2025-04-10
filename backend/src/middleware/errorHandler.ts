import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';

interface ErrorResponse {
  status: string;
  message: string;
  errors?: any[];
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error
  let error = err instanceof AppError ? err : new AppError(500, err.message, false);

  // Prepare error response
  const response: ErrorResponse = {
    status: 'error',
    message: error.message,
  };

  // Add validation errors if present
  if ('errors' in err && Array.isArray((err as any).errors)) {
    response.errors = (err as any).errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = new AppError(400, err.message);
  }

  if (err.name === 'CastError') {
    error = new AppError(400, 'Invalid input data');
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError(401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError(401, 'Token expired');
  }

  // Handle duplicate key errors (e.g., unique constraint violations)
  if ((err as any).code === '23505') {
    error = new AppError(409, 'Duplicate field value');
  }

  // Send response
  res.status(error.statusCode).json(response);
};

export const handleAuthError: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      message: 'Invalid token or no token provided',
      error: err.message
    });
    return;
  }
  next(err);
};

export class AuthenticationError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
} 