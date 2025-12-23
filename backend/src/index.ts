// Main Express + Socket.IO server entry point
// Combines HTTP server with WebSocket support

import 'dotenv/config'; // Load .env file
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './lib/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import githubAuthRoutes from './routes/github-auth';
import notesRoutes from './routes/notes';
import { setupSocketServer } from './socket';

const app = express();

// Middleware - Dynamic CORS based on environment
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', githubAuthRoutes); // GitHub OAuth routes
app.use('/api/notes', notesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

// Create HTTP server (required for Socket.IO)
const httpServer = createServer(app);

// Setup WebSocket server with dynamic CORS
setupSocketServer(httpServer, env.FRONTEND_URL);

// Start server
const PORT = parseInt(env.PORT);
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 CORS enabled for: ${env.FRONTEND_URL}`);
});

