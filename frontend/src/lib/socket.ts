// Socket.IO client singleton
// Creates authenticated WebSocket connection to backend

import { io, Socket } from 'socket.io-client';

// Use environment variable or default to localhost for development
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

// Get or create socket connection
// Authenticates using JWT token from localStorage
export function getSocket(): Socket | null {
  const token = localStorage.getItem('token');

  if (!token) {
    // Not authenticated, disconnect if connected
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'], // Skip long-polling for cleaner demo
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });
  }

  return socket;
}

// Disconnect socket (on logout)
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
