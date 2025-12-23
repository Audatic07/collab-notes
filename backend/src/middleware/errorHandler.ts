// Global error handler middleware
// Catches all errors and returns consistent JSON responses

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err.message);

  // Handle our custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Handle unexpected errors
  return res.status(500).json({
    error: 'Internal server error',
  });
}
