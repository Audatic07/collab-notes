// Authentication middleware
// Verifies JWT token and attaches user info to request

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import { UnauthorizedError } from '../lib/errors';

// Middleware to require authentication
// Extracts token from Authorization header: "Bearer <token>"
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  // Attach user info to request for use in route handlers
  req.user = payload;
  next();
}
