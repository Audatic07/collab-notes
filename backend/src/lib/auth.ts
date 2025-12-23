// Authentication utilities
// Handles password hashing and JWT token generation/verification

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from './env';

// JWT payload type - what we store in the token
export interface JwtPayload {
  userId: string;
  email: string;
}

// Hash password before storing in database
// Cost factor 10 is a good balance of security and speed
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password during login
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token for authenticated users
// Token expires in 7 days - good for a student project
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

// Verify and decode JWT token
// Returns null if invalid (instead of throwing)
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
