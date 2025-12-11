import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
import { runGameTurn, getTurnsForSession } from "./gameLogic.js";

const app = express();
const PORT = process.env.PORT || 3001;

// -----------------------------------------------
// CORS
// -----------------------------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "https://games.henrydoes.com"
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.warn("[CORS] Blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

// ==================================================
// SESSION MIDDLEWARE – PLAYER SESSIONS ONLY
// ==================================================
app.use((req, res, next) => {
  if (req.path.startsWith("/api/admin") || req.path === "/api/health") {
    return next();
  }

  let sessionId = req.cookies.session_id;

  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30
    });
  }

  // Ensure session exists in DB
  db.run(
    `
      INSERT INTO sessions (id, created_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `,
    [sessionId],
    err => {
      if (err) console.error("[DB] Session upsert failed:", err);
    }
  );

  req.sessionId = sessionId;
  next();
});

// ==================================================
// ADMIN AUTH
// ==================================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

function requireAdmin(req, res, next) {
  if (req.cookies.admin_auth === "yes") return next();
  return res.status(401).json({ error: "Not authenticated as admin" });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  res.cookie("admin_auth", "yes", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8
  });

  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_auth");
  res.json({ ok: true });
});

// ==================================================
// ADMIN — SESSION LIST
// ==================================================
app.get("/api/admin/sessions", requireAdmin, (req, res) => {
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
    ORDER BY s.created_at DESC
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
app.get("/api/admin/session/:id", requireAdmin, (req, res) => {
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
// ADMIN — DELETE ONE SESSION
// ==================================================
app.delete("/api/admin/session/:id", requireAdmin, (req, res) => {
  const sessionId = req.params.id;

  db.serialize(() => {
    db.run("DELETE FROM turns WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM state WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM players WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId], err => {
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
app.delete("/api/admin/sessions", requireAdmin, (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM turns");
    db.run("DELETE FROM state");
    db.run("DELETE FROM players");
    db.run("DELETE FROM sessions", err => {
      if (err) {
        console.error("[ADMIN] Delete-all failed:", err);
        return res.status(500).json({ error: "DB error deleting all sessions" });
      }
      res.json({ ok: true });
    });
  });
});

// ==================================================
// PLAYER — CHARACTER APIs
// ==================================================
app.get("/api/character", (req, res) => {
  db.get(
    "SELECT name, class, background, goal, alignment FROM players WHERE session_id = ?",
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

app.post("/api/character", (req, res) => {
  const { name, playerClass, background, goal, alignment } = req.body;

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
    err => {
      if (err) {
        console.error("[CHAR] Save failed:", err);
        return res.status(500).json({ error: "DB error" });
      }

      db.run(
        `
          INSERT OR IGNORE INTO state (session_id, location, health, mana, gold, inventory)
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
app.post("/api/turn", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "message is required" });

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
app.get("/api/history", async (req, res) => {
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
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", sessionId: req.sessionId });
});

// ==================================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});