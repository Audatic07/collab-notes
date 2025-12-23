// Authentication routes
// POST /api/auth/register - Create new account
// POST /api/auth/login - Login and get token
// GET /api/auth/me - Get current user info

import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword, verifyPassword, generateToken } from '../lib/auth';
import { BadRequestError, UnauthorizedError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Input validation schemas using Zod
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
// Creates a new user account
router.post('/register', async (req, res, next) => {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0].message);
    }

    const { email, password, name } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestError('Email already registered');
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate token and return
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
// Authenticates user and returns JWT token
router.post('/login', async (req, res, next) => {
  try {
    // Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0].message);
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // OAuth users don't have passwords - they must use OAuth login
    if (!user.password) {
      throw new UnauthorizedError('Please login with GitHub');
    }

    // Verify password
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate token and return
    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
// Returns current authenticated user info
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
