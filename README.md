# CollabNotes

A real-time collaborative note-taking application where multiple users can edit the same document simultaneously and see each other's changes instantly.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?logo=socket.io)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748?logo=prisma)

## What It Does

- **Create notes** with a rich text editor (bold, italic, headings, lists)
- **Share notes** by sending the URL to collaborators
- **Edit together** in real-time — changes sync instantly across all viewers
- **See who's online** with presence indicators showing active users
- **Secure access** with user accounts (email/password or GitHub login)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Vite, TipTap Editor |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (production), SQLite (development) |
| ORM | Prisma |
| Auth | JWT, GitHub OAuth |
| Hosting | Vercel (frontend), Railway (backend) |

## Running Locally

### Prerequisites

- Node.js 18 or higher
- npm

### 1. Clone and Install

```bash
git clone https://github.com/Audatic07/collab-notes.git
cd collab-notes
```

### 2. Start the Backend

```bash
cd backend
npm install
npm run db:generate    # Generate Prisma client
npm run db:push        # Create database tables
npm run dev            # Start server on port 3001
```

### 3. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev            # Start app on port 5173
```

### 4. Open the App

Go to http://localhost:5173, create an account, and start making notes.

## Project Structure

```
collab-notes/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   └── src/
│       ├── index.ts              # Express server entry point
│       ├── routes/
│       │   ├── auth.ts           # Register, login, user info
│       │   ├── github-auth.ts    # GitHub OAuth flow
│       │   └── notes.ts          # CRUD for notes
│       ├── socket/
│       │   └── index.ts          # WebSocket event handlers
│       ├── middleware/
│       │   ├── auth.ts           # JWT verification
│       │   └── errorHandler.ts   # Error handling
│       └── lib/
│           ├── auth.ts           # Password hashing, JWT utils
│           ├── env.ts            # Environment config
│           ├── errors.ts         # Custom error classes
│           └── prisma.ts         # Database client
│
└── frontend/
    └── src/
        ├── App.tsx               # Routes
        ├── main.tsx              # Entry point
        ├── index.css             # Styles
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── AuthCallbackPage.tsx
        │   ├── NotesListPage.tsx
        │   └── NoteEditorPage.tsx
        ├── components/
        │   ├── PresenceIndicator.tsx
        │   └── ProtectedRoute.tsx
        ├── context/
        │   └── AuthContext.tsx   # Auth state management
        └── lib/
            ├── api.ts            # REST API client
            └── socket.ts         # WebSocket client
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (requires auth) |
| GET | `/api/auth/github` | Redirect to GitHub OAuth |
| GET | `/api/auth/github/callback` | Handle OAuth callback |

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes owned by user |
| POST | `/api/notes` | Create a new note |
| GET | `/api/notes/:id` | Get a specific note |
| PUT | `/api/notes/:id` | Update note (owner only) |
| DELETE | `/api/notes/:id` | Delete note (owner only) |

### WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-note` | Client → Server | Subscribe to updates for a note |
| `leave-note` | Client → Server | Unsubscribe from a note |
| `note-update` | Client → Server | Send content changes |
| `note-updated` | Server → Client | Receive content changes |
| `presence-update` | Server → Client | List of users viewing the note |

## Deploying to Production

### Overview

1. Push code to GitHub
2. Deploy backend to Railway (with PostgreSQL)
3. Deploy frontend to Vercel
4. Connect them with environment variables

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/collab-notes.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend (Railway)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Create new project → Deploy from GitHub repo → Select your repo
3. Click the service → Settings → Set **Root Directory** to `backend`
4. Add PostgreSQL: Click "New" → "Database" → "Add PostgreSQL"
5. Add environment variables in the backend service:
   - `JWT_SECRET` = (any random string, 32+ characters)
   - `PORT` = `3001`
6. Set build command: `npm run db:use-postgres && npm run db:generate && npm run build`
7. Set start command: `npm run db:push && npm start`
8. Go to Settings → Networking → Generate Domain
9. Copy your Railway URL (e.g., `your-app.up.railway.app`)

### Step 3: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Add New → Project → Import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = `https://your-railway-url` (from step 2)
5. Deploy and copy your Vercel URL

### Step 4: Connect Backend to Frontend

Go back to Railway → backend service → Variables → Add:
- `FRONTEND_URL` = `https://your-vercel-url` (from step 3)

Railway will auto-redeploy.

### Step 5: GitHub OAuth (Optional)

To enable "Login with GitHub":

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Create New OAuth App:
   - Homepage URL: your Vercel URL
   - Callback URL: `https://your-railway-url/api/auth/github/callback`
3. Add to Railway variables:
   - `GITHUB_CLIENT_ID` = (from GitHub)
   - `GITHUB_CLIENT_SECRET` = (from GitHub)

## How Real-Time Sync Works

The app uses a simple **last-write-wins** approach:

1. User opens a note → joins a Socket.IO "room" for that note
2. User types → changes are debounced (300ms) then sent to server
3. Server saves to database and broadcasts to all users in the room
4. Other users receive the update and their editors sync

This approach was chosen over more complex solutions (CRDTs, Operational Transform) because:
- The sync interval is fast enough that conflicts are rare
- The implementation is straightforward and maintainable
- It's similar to how Apple Notes and Google Keep handle sync

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL="file:./dev.db"           # SQLite for local dev
JWT_SECRET="your-secret-key"           # For signing JWTs
PORT=3001                              # Server port
FRONTEND_URL="http://localhost:5173"   # For CORS
GITHUB_CLIENT_ID=""                    # Optional: GitHub OAuth
GITHUB_CLIENT_SECRET=""                # Optional: GitHub OAuth
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3001     # Backend URL
```

## License

MIT
