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
- Cookie-based session tracking (persistent per-player saves)
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
- View all sessions (filtered: no empty/ghost sessions)
- See player profile, state, and full recent turn history
- Delete one session (with all linked data)
- Delete all sessions (complete reset)
- Dummy data seeding for development
- Clean REST API structure

### ⭐ Core Improvements + Foundations
- REST-cleaned admin endpoints
- Fixed `DELETE /api/admin/sessions` and added POST alias
- Improved error responses across the API
- Added safe session upsert (fixes ghost-cookie issue)
- Admin endpoints now bypass session creation
- Added dummy seed data for better testing
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
  game.db

web/
  src/
    api.js
    App.jsx
    index.less
    main.jsx
    components/
      admin/
      CharacterSetup.jsx
      GameView.jsx
```

## Development Notes
- Cookies use SameSite=Lax
- SQLite schema auto-initializes
- Dummy seed data loads only on empty DB
- Short-context prompt used for AI
- Admin routes bypass session middleware

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
