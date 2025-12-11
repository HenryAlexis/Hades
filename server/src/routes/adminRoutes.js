// server/src/routes/adminRoutes.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

// ==================================================
// ADMIN AUTH
// ==================================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

function requireAdmin(req, res, next) {
  if (req.cookies.admin_auth === "yes") return next();
  return res.status(401).json({ error: "Not authenticated as admin" });
}

// ---------------- LOGIN / LOGOUT ----------------

// POST /api/admin/login
router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  res.cookie("admin_auth", "yes", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  });

  res.json({ ok: true });
});

// POST /api/admin/logout
router.post("/logout", (req, res) => {
  res.clearCookie("admin_auth");
  res.json({ ok: true });
});

// ==================================================
// ADMIN — STATS (for dashboard header)
// ==================================================
// GET /api/admin/stats
router.get("/stats", requireAdmin, (req, res) => {
  const stats = {
    totalSessions: 0,
    totalPlayers: 0,
    totalTurns: 0,
    recentSessions24h: 0
  };

  db.serialize(() => {
    db.get(`SELECT COUNT(*) AS c FROM sessions`, [], (err, row) => {
      if (err) {
        console.error("[ADMIN] Stats sessions failed:", err);
      } else {
        stats.totalSessions = row?.c ?? 0;
      }
    });

    db.get(`SELECT COUNT(*) AS c FROM players`, [], (err, row) => {
      if (err) {
        console.error("[ADMIN] Stats players failed:", err);
      } else {
        stats.totalPlayers = row?.c ?? 0;
      }
    });

    db.get(`SELECT COUNT(*) AS c FROM turns`, [], (err, row) => {
      if (err) {
        console.error("[ADMIN] Stats turns failed:", err);
      } else {
        stats.totalTurns = row?.c ?? 0;
      }
    });

    db.get(
      `
        SELECT COUNT(*) AS c
        FROM sessions
        WHERE datetime(created_at) >= datetime('now', '-1 day')
      `,
      [],
      (err, row) => {
        if (err) {
          console.error("[ADMIN] Stats recent sessions failed:", err);
        } else {
          stats.recentSessions24h = row?.c ?? 0;
        }
        // respond after last query (serialize keeps order)
        res.json(stats);
      }
    );
  });
});

// ==================================================
// ADMIN — SESSION LIST
// ==================================================
// GET /api/admin/sessions
router.get("/sessions", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      s.id AS session_id,
      s.created_at,
      s.updated_at,
      p.name AS player_name,
      p.class AS player_class,
      p.goal AS player_goal
    FROM sessions s
    LEFT JOIN players p ON p.session_id = s.id
    WHERE p.name IS NOT NULL
    ORDER BY s.updated_at DESC
    LIMIT 100
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("[ADMIN] Failed to load sessions:", err);
      return res.status(500).json({ error: "DB error loading sessions" });
    }
    res.json({ sessions: rows });
  });
});

// ==================================================
// ADMIN — SESSION DETAILS
// ==================================================
// GET /api/admin/session/:id
router.get("/session/:id", requireAdmin, (req, res) => {
  const sessionId = req.params.id;
  const result = { sessionId };

  db.get(
    `SELECT name, class, background, goal, alignment FROM players WHERE session_id = ?`,
    [sessionId],
    (err, player) => {
      if (err) {
        console.error("[ADMIN] Load player failed:", err);
        return res.status(500).json({ error: "DB error" });
      }

      result.player = player || null;

      db.get(
        `
          SELECT location, health, mana, gold, inventory
          FROM state
          WHERE session_id = ?
        `,
        [sessionId],
        (err2, state) => {
          if (err2) {
            console.error("[ADMIN] Load state failed:", err2);
            return res.status(500).json({ error: "DB error" });
          }

          result.state = state || null;

          db.all(
            `
              SELECT role, content, created_at
              FROM turns
              WHERE session_id = ?
              ORDER BY id DESC
              LIMIT 30
            `,
            [sessionId],
            (err3, turns) => {
              if (err3) {
                console.error("[ADMIN] Load turns failed:", err3);
                return res.status(500).json({ error: "DB error" });
              }

              result.turns = (turns || []).reverse();
              res.json(result);
            }
          );
        }
      );
    }
  );
});

// ==================================================
// ADMIN — UPDATE PLAYER PROFILE
// ==================================================
// PATCH /api/admin/player/:sessionId
router.patch("/player/:sessionId", requireAdmin, (req, res) => {
  const { sessionId } = req.params;
  const { name, playerClass, goal, alignment, background } = req.body || {};

  const fields = [];
  const params = [];

  if (typeof name === "string") {
    fields.push("name = ?");
    params.push(name);
  }
  if (typeof playerClass === "string") {
    fields.push("class = ?");
    params.push(playerClass);
  }
  if (typeof goal === "string") {
    fields.push("goal = ?");
    params.push(goal);
  }
  if (typeof alignment === "string") {
    fields.push("alignment = ?");
    params.push(alignment);
  }
  if (typeof background === "string") {
    fields.push("background = ?");
    params.push(background);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  const sql = `
    UPDATE players
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `;
  params.push(sessionId);

  db.run(sql, params, function (err) {
    if (err) {
      console.error("[ADMIN] Update player failed:", err);
      return res.status(500).json({ error: "DB error updating player" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Player not found for session" });
    }
    res.json({ ok: true });
  });
});

// ==================================================
// ADMIN — RESET SESSION STORY (keep player, wipe turns+state)
// ==================================================
// POST /api/admin/session/:id/reset
router.post("/session/:id/reset", requireAdmin, (req, res) => {
  const sessionId = req.params.id;

  db.serialize(() => {
    db.run("DELETE FROM turns WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM state WHERE session_id = ?", [sessionId]);
    db.run(
      `
        UPDATE sessions
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [sessionId],
      (err) => {
        if (err) {
          console.error("[ADMIN] Reset session failed:", err);
          return res.status(500).json({ error: "DB error resetting session" });
        }
        res.json({ ok: true });
      }
    );
  });
});

// ==================================================
// ADMIN — DELETE ONE SESSION
// ==================================================
// DELETE /api/admin/session/:id
router.delete("/session/:id", requireAdmin, (req, res) => {
  const sessionId = req.params.id;

  db.serialize(() => {
    db.run("DELETE FROM turns WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM state WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM players WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId], (err) => {
      if (err) {
        console.error("[ADMIN] Delete session failed:", err);
        return res.status(500).json({ error: "DB error deleting session" });
      }

      res.json({ ok: true });
    });
  });
});

// ==================================================
// ADMIN — DELETE ALL SESSIONS
// ==================================================
// DELETE /api/admin/sessions
router.delete("/sessions", requireAdmin, (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM turns");
    db.run("DELETE FROM state");
    db.run("DELETE FROM players");
    db.run("DELETE FROM sessions", (err) => {
      if (err) {
        console.error("[ADMIN] Delete-all failed:", err);
        return res.status(500).json({ error: "DB error deleting all sessions" });
      }
      res.json({ ok: true });
    });
  });
});

export { router as adminRouter };