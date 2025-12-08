# Project Hades

Dark fantasy text-based MMO prototype with a React/Vite frontend and an Express + SQLite backend driven by the DeepSeek chat model.

## Features
- Cookie-based sessions to keep per-player characters and turn history.
- Character creation flow with class/background/alignment and persisted state.
- Turn-based play loop that streams player input to DeepSeek and returns narrated choices.
- SQLite persistence for sessions, players, turns, and basic player state.

## Prerequisites
- Node.js 18+ (backend uses ES modules).
- Access to the DeepSeek API and an API key.
- `sqlite3` available in your runtime environment (database file stored locally as `server/game.db`).

## Setup
### 1) Backend (`server`)
```bash
cd server
npm install
```
Create `server/.env` with your secrets:
```env
DEEPSEEK_API_KEY=your_key_here
PORT=3001            # optional override
NODE_ENV=development # optional
```
Run the server:
```bash
npm run dev   # with nodemon
# or
npm start     # plain node
```
The API will default to `http://localhost:3001` and persists data to `server/game.db` in-place.

### 2) Frontend (`web`)
```bash
cd web
npm install
npm run dev
```
Vite serves the app at `http://localhost:5173` by default. The frontend expects the API at `http://localhost:3001`; update `API_BASE` in `web/src/api.js` if you deploy elsewhere.

## Project Structure
- `server/src/server.js` – Express app, routes, and session handling.
- `server/src/db.js` – SQLite connection and schema initialization.
- `server/src/gameLogic.js` – Builds DeepSeek prompts, stores turns, manages continuity.
- `server/src/worldConfig.js` – World lore and system prompt constraints.
- `server/src/deepseekClient.js` – OpenAI client configured for DeepSeek.
- `web/src` – React app (character setup, game view, API client).

## Development Notes
- Cookies are `SameSite=Lax` and not marked `secure`; enable `secure` when serving over HTTPS.
- `game.db` is committed locally; back it up or add to `.gitignore` if you prefer ephemeral dev data.
- Model temperature is set to `0.9`; adjust in `server/src/gameLogic.js` if you need more/less variance.
- Every model response must end with numbered choices (enforced by the prompt in `worldConfig.js`).

## Useful Commands
- `cd server && npm run dev` – Start backend with reload.
- `cd web && npm run dev` – Start frontend via Vite.
- `cd web && npm run build` – Production build of the client.

## Deployment Tips
- Set `API_BASE` in `web/src/api.js` to your deployed backend origin.
- Serve the backend with HTTPS and set the session cookie `secure: true`.
- Provision a writable location for `game.db` or point SQLite to a managed volume.
