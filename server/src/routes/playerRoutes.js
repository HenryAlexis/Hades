// server/src/routes/playerRoutes.js
import express from "express";
import { db } from "../db.js";
import { runGameTurn, getTurnsForSession } from "../gameLogic.js";

const router = express.Router();

// ==================================================
// PLAYER — CHARACTER APIs
// ==================================================
// GET /api/character
router.get("/character", (req, res) => {
  db.get(
    `
      SELECT name, class, background, goal, alignment
      FROM players
      WHERE session_id = ?
    `,
    [req.sessionId],
    (err, row) => {
      if (err) {
        console.error("[CHAR] Load failed:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(row || null);
    }
  );
});

// POST /api/character
router.post("/character", (req, res) => {
  const { name, playerClass, background, goal, alignment } = req.body || {};

  db.run(
    `
      INSERT INTO players (session_id, name, class, background, goal, alignment)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        name = excluded.name,
        class = excluded.class,
        background = excluded.background,
        goal = excluded.goal,
        alignment = excluded.alignment,
        updated_at = CURRENT_TIMESTAMP
    `,
    [req.sessionId, name, playerClass, background, goal, alignment],
    (err) => {
      if (err) {
        console.error("[CHAR] Save failed:", err);
        return res.status(500).json({ error: "DB error" });
      }

      db.run(
        `
          INSERT OR IGNORE INTO state (
            session_id,
            location,
            health,
            mana,
            gold,
            inventory
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          req.sessionId,
          "bleak_marches",
          100,
          50,
          0,
          JSON.stringify(["Rusty Dagger"])
        ]
      );

      res.json({ ok: true });
    }
  );
});

// ==================================================
// PLAYER — GAME TURN
// ==================================================
// POST /api/turn
router.post("/turn", async (req, res) => {
  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const reply = await runGameTurn(req.sessionId, message);
    res.json({ reply });
  } catch (e) {
    console.error("[TURN] Error:", e);
    res.status(500).json({ error: "Failed to run game turn" });
  }
});

// ==================================================
// PLAYER — HISTORY
// ==================================================
// GET /api/history
router.get("/history", async (req, res) => {
  try {
    const turns = await getTurnsForSession(req.sessionId, 6);
    res.json({ turns });
  } catch (err) {
    console.error("[HISTORY] Error:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
});

// ==================================================
// HEALTH CHECK
// ==================================================
// GET /api/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", sessionId: req.sessionId });
});

export { router as playerRouter };