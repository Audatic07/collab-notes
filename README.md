# 📝 CollabNotes

> Real-time collaborative notes with presence awareness, built with React, Node.js, and Socket.IO

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?logo=socket.io)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="https://github.com/user-attachments/assets/placeholder.png" alt="CollabNotes Demo" width="600">
</p>

## ✨ Features

- 🔐 **Authentication** — JWT + GitHub OAuth for seamless login
- 📝 **Rich Text Editor** — TipTap-powered with formatting support
- ⚡ **Real-Time Sync** — See changes instantly via WebSockets
- 👥 **Presence Indicators** — Know who's viewing your note
- 🔒 **Authorization** — Owner-only editing with share-by-link viewing
- ☁️ **Cloud Ready** — Deploy to Railway + Vercel in minutes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/collab-notes.git
cd collab-notes

# Setup backend
cd backend
npm install
npm run db:generate
npm run db:push
npm run dev

# In a new terminal, setup frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start collaborating!

## 🏗️ Architecture

```
┌─────────────────┐                     ┌─────────────────┐
│   React + Vite  │◄───── REST/WS ─────►│ Express + Socket│
│    (Vercel)     │                     │    (Railway)    │
└────────┬────────┘                     └────────┬────────┘
         │                                       │
         │ OAuth                                 │ Prisma
         ▼                                       ▼
┌─────────────────┐                     ┌─────────────────┐
│  GitHub OAuth   │                     │   PostgreSQL    │
└─────────────────┘                     └─────────────────┘
```

## 📁 Project Structure

```
collab-notes/
├── backend/
│   ├── prisma/schema.prisma    # Database models
│   └── src/
│       ├── routes/             # REST API endpoints
│       │   ├── auth.ts         # Login/register
│       │   ├── github-auth.ts  # OAuth flow
│       │   └── notes.ts        # CRUD operations
│       ├── socket/index.ts     # WebSocket handlers
│       └── lib/                # Utilities
│
└── frontend/
    └── src/
        ├── pages/              # Route components
        ├── components/         # Reusable UI
        ├── context/            # Auth state
        └── lib/                # API + Socket clients
```

## 📡 API Reference

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Get JWT token |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/auth/github` | Start GitHub OAuth |
| `GET` | `/api/auth/github/callback` | OAuth callback |

</details>

<details>
<summary><strong>Notes</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notes` | List user's notes |
| `POST` | `/api/notes` | Create note |
| `GET` | `/api/notes/:id` | Get single note |
| `PUT` | `/api/notes/:id` | Update note (owner only) |
| `DELETE` | `/api/notes/:id` | Delete note (owner only) |

</details>

<details>
<summary><strong>WebSocket Events</strong></summary>

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-note` | Client → Server | Join note room |
| `leave-note` | Client → Server | Leave note room |
| `note-update` | Client → Server | Send edit |
| `note-updated` | Server → Client | Receive edit |
| `presence-update` | Server → Client | Users changed |

</details>

## ☁️ Deployment

> **Deployment Order:** GitHub → Railway (backend) → Vercel (frontend) → Update Railway → GitHub OAuth

### Step 1: Push to GitHub

```bash
# Create repo at github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/collab-notes.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend (Railway)

1. Go to [railway.app](https://railway.app) → Sign in with GitHub
2. **New Project** → **Deploy from GitHub repo** → Select `collab-notes`
3. Click the service → **Settings** → Set **Root Directory**: `backend`
4. **New** → **Database** → **Add PostgreSQL**
5. Backend service → **Variables** tab → Add:
   ```
   JWT_SECRET=your-random-secret-at-least-32-chars
   ```
6. **Settings** → **Deploy**:
   - Build: `npm run db:use-postgres && npm run db:generate && npm run build`
   - Start: `npm run db:push && npm start`
7. **Settings** → **Networking** → **Generate Domain** → 📋 Copy URL

### Step 3: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub  
2. **Add New** → **Project** → Import `collab-notes`
3. Set **Root Directory**: `frontend`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-railway-url-from-step-2
   ```
5. **Deploy** → 📋 Copy your Vercel URL

### Step 4: Connect Frontend to Backend

Go to Railway → backend → **Variables** → Add:
```
FRONTEND_URL=https://your-vercel-url-from-step-3
```

### Step 5: GitHub OAuth (Optional)

1. [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. **Homepage URL**: `https://your-vercel-url`
3. **Callback URL**: `https://your-railway-url/api/auth/github/callback`
4. Copy Client ID + generate Client Secret
5. Add to Railway **Variables**:
   ```
   GITHUB_CLIENT_ID=xxx
   GITHUB_CLIENT_SECRET=xxx
   ```

### ✅ Done!

Your app is live! Share your Vercel URL with friends.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, TypeScript, Vite, TipTap |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | PostgreSQL, Prisma ORM |
| **Auth** | JWT, GitHub OAuth |
| **Hosting** | Vercel, Railway |

## 🎯 Design Decisions

<details>
<summary><strong>Why Last-Write-Wins instead of CRDTs?</strong></summary>

- ✅ Simple implementation (~50 lines vs 500+ for OT/CRDT)
- ✅ 300ms sync interval minimizes conflict window
- ✅ Matches behavior of Apple Notes, Google Keep
- ✅ Easy to understand and explain in interviews

</details>

<details>
<summary><strong>Why GitHub OAuth?</strong></summary>

- ✅ One-click login for demos
- ✅ No password management complexity
- ✅ Perfect for sharing with developer friends

</details>

<details>
<summary><strong>Why Railway + Vercel?</strong></summary>

- ✅ Generous free tiers
- ✅ Railway supports WebSockets
- ✅ Automatic GitHub deployments
- ✅ Zero DevOps required

</details>

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for learning full-stack development
</p>
