// server/src/routes/playerRoutes.js
import express from "express";
import { db } from "../db.js";
import { runGameTurn, getTurnsForSession } from "../gameLogic.js";
import { deepseek } from "../deepseekClient.js";

const router = express.Router();
const personalityRateLimit = new Map(); // sessionId -> timestamp ms

// ==================================================
// PLAYER — CHARACTER APIs
// ==================================================
// GET /api/character
router.get("/character", (req, res) => {
  db.get(
    `
      SELECT name, class, background, personality, alignment
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
  const { name, playerClass, background, personality, alignment } = req.body || {};

  db.run(
    `
      INSERT INTO players (session_id, name, class, background, personality, alignment)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        name = excluded.name,
        class = excluded.class,
        background = excluded.background,
        personality = excluded.personality,
        alignment = excluded.alignment,
        updated_at = CURRENT_TIMESTAMP
    `,
    [req.sessionId, name, playerClass, background, personality, alignment],
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

// POST /api/suggest/personality
router.post("/suggest/personality", async (req, res) => {
  const now = Date.now();
  const lastHit = personalityRateLimit.get(req.sessionId) || 0;
  if (now - lastHit < 700) {
    return res.status(429).json({ error: "rate_limited", suggestions: [] });
  }
  personalityRateLimit.set(req.sessionId, now);

  const { text } = req.body || {};
  if (!text || typeof text !== "string" || text.trim().length < 2) {
    return res.json({ suggestions: [] });
  }

  const prompt = `
Given a short player description, suggest 5-8 concise personality hooks (<=35 chars each) suitable for a dark fantasy adventurer.
Return ONLY a JSON array of strings, no prose, no prefixes.
Description: "${text.trim()}"
`.trim();

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 180,
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    let suggestions = [];

    // Try strict JSON parse first
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((s) => typeof s === "string")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // Fallback: split by lines or semicolons
      suggestions = raw
        .split(/\n|;/)
        .map((s) => s.replace(/^-+\s*/, "").trim())
        .filter(Boolean);
    }

    // Normalize length limits and count
    suggestions = suggestions
      .map((s) => (s.length > 70 ? s.slice(0, 70).trim() : s))
      .slice(0, 8);

    res.json({ suggestions });
  } catch (err) {
    console.error("[SUGGEST personality] Failed:", err);
    res.status(500).json({ error: "suggestion_failed", suggestions: [] });
  }
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
