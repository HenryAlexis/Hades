# Project Hades

A dark-fantasy interactive narrative engine.  
Players create a character, interact with the world, and the AI generates story progression.  
Built with **React/Vite** on the frontend and **Express + SQLite** on the backend, powered by **DeepSeek Chat**.

## Overview

Project Hades is evolving into a *self-writing story system*:
- Players generate a character.
- The AI narrates the world and responds to user actions.
- The system stores continuity, turn history, player state, and world progression.
- Admin tools allow inspection and control of all sessions and data.

This README describes the current codebase—including foundational backend improvements, admin management tools, and game state scaffolding—so developers and AI assistants can extend the system safely.

## Features

### ⭐ Player-Facing Features
- Cookie-based session tracking (persistent per-player saves) via dedicated middleware
- Character creation flow:
  - name, class, alignment, background, goal
- Turn-based narrative loop:
  - Player input → DeepSeek → short structured responses
  - Turn history saved per session
- Player state:
  - location, health, mana, gold, inventory
- Lightweight prompt structure for predictable AI output

### ⭐ Admin Features
- Password-protected admin dashboard (`/admin`)
- Session list (no empty/ghost sessions) with class/goal context
- Per-session drilldown: player profile, state, last 30 turns
- Delete one session, reset one session (keep player), or delete all sessions
- Login/logout cookies for admin-only endpoints
- Stats header (totals, today’s sessions, mode: dummy vs live)

### ⭐ Core Improvements + Foundations
- Routes split into `playerRoutes` and `adminRoutes`
- Dedicated `playerSession` middleware to upsert session cookie + DB row (skips admin/health)
- REST-cleaned admin endpoints with explicit login/logout + auth guard
- History endpoint for players (`GET /api/history`) and improved error handling
- Prepared scaffolding for future systems (lore, NPCs, story engine)

## Prerequisites
- **Node.js 18+**
- **SQLite** installed on the host
- **DeepSeek API Key**

## Setup

### 🔧 Backend (`server`)
```
cd server
npm install
```

Create `.env`:
```
DEEPSEEK_API_KEY=your_key_here
ADMIN_PASSWORD=choose_a_secret
PORT=3001
```

Run server:
```
npm run dev
```

### 💻 Frontend (`web`)
```
cd web
npm install
npm run dev
```

## Project Structure

```
server/
  src/
    server.js
    db.js
    gameLogic.js
    deepseekClient.js
    worldConfig.js
    middleware/
      playerSession.js
    routes/
      playerRoutes.js
      adminRoutes.js
  game.db

web/
  src/
    api.js
    App.jsx
    index.less
    main.jsx
    components/
      admin/
        AdminHeader.jsx
        AdminLogin.jsx
        AdminSessionDetails.jsx
        AdminSessionList.jsx
        AdminView.jsx
      CharacterSetup.jsx
      GameView.jsx
```

## Development Notes
- Cookies use SameSite=Lax
- Player session middleware sets a cookie + upserts session rows; admin + health routes bypass it
- Admin auth is a simple password stored in env; login sets `admin_auth` cookie
- SQLite schema auto-initializes
- Dummy seed data loads only on empty DB
- Short-context prompt used for AI

## Useful Commands
```
cd server && npm run dev
cd web && npm run dev
cd web && npm run build
```

## Deployment Tips
- API_BASE auto-detects localhost vs production
- Enable secure cookies under HTTPS
- Ensure SQLite writable location

## Future Systems Prep
- Lore codex
- NPC and PC profiles
- Story engine expansion
- World map
- Story arc summarization
