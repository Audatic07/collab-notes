// Notes routes
// GET /api/notes - List user's notes
// POST /api/notes - Create new note
// GET /api/notes/:id - Get single note (owner or viewer)
// PUT /api/notes/:id - Update note (owner only)
// DELETE /api/notes/:id - Delete note (owner only)

import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All notes routes require authentication
router.use(requireAuth);

// Input validation schemas
const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional().default('{}'),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

// GET /api/notes
// Returns all notes owned by the current user
router.get('/', async (req, res, next) => {
  try {
    const notes = await prisma.note.findMany({
      where: { ownerId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

// POST /api/notes
// Creates a new note owned by current user
router.post('/', async (req, res, next) => {
  try {
    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0].message);
    }

    const note = await prisma.note.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        ownerId: req.user!.userId,
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/:id
// Returns a single note - anyone can view for collaboration
router.get('/:id', async (req, res, next) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Return note with ownership flag
    res.json({
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        owner: note.owner,
        isOwner: note.ownerId === req.user!.userId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notes/:id
// Updates a note - OWNER ONLY (authorization check)
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = updateNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0].message);
    }

    // First, check if note exists and user is owner
    const existing = await prisma.note.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Note not found');
    }

    // AUTHORIZATION: Only owner can edit
    if (existing.ownerId !== req.user!.userId) {
      throw new ForbiddenError('Only the note owner can edit');
    }

    // Update the note
    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ note });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notes/:id
// Deletes a note - OWNER ONLY
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.note.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Note not found');
    }

    // AUTHORIZATION: Only owner can delete
    if (existing.ownerId !== req.user!.userId) {
      throw new ForbiddenError('Only the note owner can delete');
    }

    await prisma.note.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Note deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
