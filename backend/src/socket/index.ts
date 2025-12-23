// Socket.IO handler for real-time collaboration
// Handles: authentication, room management, presence, and content sync
//
// ARCHITECTURE DECISION: Last-Write-Wins
// =======================================
// Why we use "last-write-wins" instead of OT/CRDT:
// 
// 1. SIMPLICITY: OT/CRDT adds 500+ lines of complex code
// 2. GOOD ENOUGH: For a notes app, occasional overwrites are acceptable
// 3. INTERVIEW FRIENDLY: Easy to explain and defend
// 4. REAL USE CASE: Google Keep, Apple Notes use similar approaches
//
// Trade-off: If two users edit simultaneously, one edit may be lost.
// Mitigation: Fast sync (every keystroke) minimizes conflict window.

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../lib/auth';
import prisma from '../lib/prisma';

// Track which users are in which rooms
// Map: noteId -> Map of socketId -> user info
interface PresenceUser {
  odId: string;
  name: string;
  email: string;
}

const roomPresence = new Map<string, Map<string, PresenceUser>>();

// Extend Socket type to include our user data
interface AuthenticatedSocket extends Socket {
  user?: JwtPayload & { name: string };
}

export function setupSocketServer(httpServer: HttpServer, frontendUrl: string) {
  const io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // AUTHENTICATION MIDDLEWARE
  // Verify JWT before allowing socket connection
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    // Fetch user name for presence display
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user info to socket
    socket.user = { ...payload, name: user.name };
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.email}`);

    // JOIN NOTE ROOM
    // Client sends this when opening a note
    socket.on('join-note', async (noteId: string) => {
      if (!socket.user) return;

      // Verify note exists
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: { id: true, ownerId: true },
      });

      if (!note) {
        socket.emit('error', { message: 'Note not found' });
        return;
      }

      // Join the Socket.IO room for this note
      socket.join(noteId);

      // Add user to presence tracking
      if (!roomPresence.has(noteId)) {
        roomPresence.set(noteId, new Map());
      }

      const room = roomPresence.get(noteId)!;
      room.set(socket.id, {
        odId: socket.user.userId,
        name: socket.user.name,
        email: socket.user.email,
      });

      // Broadcast updated presence to everyone in room
      const users = Array.from(room.values());
      io.to(noteId).emit('presence-update', { users });

      console.log(`${socket.user.name} joined note ${noteId}`);
    });

    // LEAVE NOTE ROOM
    // Client sends this when navigating away from note
    socket.on('leave-note', (noteId: string) => {
      handleLeaveNote(socket, noteId, io);
    });

    // NOTE CONTENT UPDATE
    // Client sends full content on every change (last-write-wins)
    socket.on('note-update', async (data: { noteId: string; content: string; title?: string }) => {
      if (!socket.user) return;

      const { noteId, content, title } = data;

      // AUTHORIZATION: Check if user is owner
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: { ownerId: true },
      });

      if (!note) {
        socket.emit('error', { message: 'Note not found' });
        return;
      }

      if (note.ownerId !== socket.user.userId) {
        socket.emit('error', { message: 'Only the owner can edit this note' });
        return;
      }

      // Save to database
      const updateData: { content: string; title?: string } = { content };
      if (title !== undefined) {
        updateData.title = title;
      }

      await prisma.note.update({
        where: { id: noteId },
        data: updateData,
      });

      // Broadcast to ALL users in room (including sender for confirmation)
      // This ensures everyone has the same content
      io.to(noteId).emit('note-updated', {
        content,
        title,
        updatedBy: socket.user.name,
      });
    });

    // HANDLE DISCONNECT
    // Remove user from all rooms they were in
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.email}`);

      // Find and leave all rooms this socket was in
      roomPresence.forEach((room, noteId) => {
        if (room.has(socket.id)) {
          handleLeaveNote(socket, noteId, io);
        }
      });
    });
  });

  return io;
}

// Helper function to handle leaving a note room
function handleLeaveNote(socket: AuthenticatedSocket, noteId: string, io: Server) {
  socket.leave(noteId);

  const room = roomPresence.get(noteId);
  if (room) {
    room.delete(socket.id);

    // Clean up empty rooms
    if (room.size === 0) {
      roomPresence.delete(noteId);
    } else {
      // Broadcast updated presence
      const users = Array.from(room.values());
      io.to(noteId).emit('presence-update', { users });
    }
  }

  console.log(`${socket.user?.name} left note ${noteId}`);
}
