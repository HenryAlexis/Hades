// server/src/middleware/playerSession.js
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";

/**
 * playerSessionMiddleware
 *
 * - Skips all /api/admin* and /api/health requests
 * - Ensures a cookie-based session_id for player routes
 * - Upserts the session row in the DB (created_at / updated_at)
 * - Attaches sessionId to req.sessionId
 */
export function playerSessionMiddleware(req, res, next) {
  // Skip session tracking for admin + health endpoints
  if (req.path.startsWith("/api/admin") || req.path === "/api/health") {
    return next();
  }

  let sessionId = req.cookies.session_id;

  // Create session cookie if missing
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });
  }

  // Ensure session exists in DB / bump updated_at
  db.run(
    `
      INSERT INTO sessions (id, created_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `,
    [sessionId],
    (err) => {
      if (err) {
        console.error("[DB] Session upsert failed:", err);
      }
    }
  );

  req.sessionId = sessionId;
  next();
}