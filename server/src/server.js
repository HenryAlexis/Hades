import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
import { runGameTurn, getTurnsForSession } from "./gameLogic.js";

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS: allow localhost (dev) and games.henrydoes.com (prod) ---

const allowedOrigins = [
  "http://localhost:5173",
  "https://games.henrydoes.com"
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser / same-origin requests (e.g. curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

// ==================================================
// SESSION MIDDLEWARE (cookie-based for players)
// ==================================================

app.use((req, res, next) => {
  // Skip session tracking for admin + health endpoints
  if (req.path.startsWith("/api/admin") || req.path === "/api/health") {
    return next();
  }

  let sessionId = req.cookies.session_id;

  // If no cookie, create one
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // enable in production with https
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });
  }

  // ALWAYS upsert into sessions table, even if the cookie already existed.
  // This fixes the case where rows were deleted via admin but cookies remain.
  db.run(
    `
      INSERT INTO sessions (id, created_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
    `,
    [sessionId],
    (err) => {
      if (err) {
        console.error("Error upserting session:", err);
      }
    }
  );

  req.sessionId = sessionId;
  next();
});

// ==================================================
// ADMIN AUTH (simple password + cookie)
// ==================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

function requireAdmin(req, res, next) {
  if (req.cookies.admin_auth === "yes") {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated as admin" });
}

// Admin login: POST /api/admin/login { password }
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  // Set admin cookie
  res.cookie("admin_auth", "yes", {
    httpOnly: true,
    sameSite: "lax",
    // secure: true, // enable with https
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  });

  res.json({ ok: true });
});

// Optional: logout admin
app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_auth");
  res.json({ ok: true });
});

// List sessions with basic info (admin only)
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
    WHERE p.name IS NOT NULL              -- hide sessions with no character
    ORDER BY s.created_at DESC
    LIMIT 100
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Admin sessions error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json({ sessions: rows });
  });
});

// Session details: player, state, recent history (admin only)
app.get("/api/admin/session/:id", requireAdmin, (req, res) => {
  const sessionId = req.params.id;
  const result = { sessionId };

  db.get(
    `
      SELECT name, class, background, goal, alignment
      FROM players
      WHERE session_id = ?
    `,
    [sessionId],
    (err, player) => {
      if (err) {
        console.error("Admin player error:", err);
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
            console.error("Admin state error:", err2);
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
                console.error("Admin turns error:", err3);
                return res.status(500).json({ error: "DB error" });
              }

              result.turns = (turns || []).reverse(); // oldest → newest
              res.json(result);
            }
          );
        }
      );
    }
  );
});

// Delete ONE session + all its data
app.delete("/api/admin/session/:id", requireAdmin, (req, res) => {
  const sessionId = req.params.id;

  db.serialize(() => {
    db.run("DELETE FROM turns WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM state WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM players WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM sessions WHERE id = ?", [sessionId], (err) => {
      if (err) {
        console.error("Admin delete session error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ ok: true });
    });
  });
});

// Delete ALL sessions + all related data (POST version)
app.post("/api/admin/sessions/delete-all", requireAdmin, (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM turns");
    db.run("DELETE FROM state");
    db.run("DELETE FROM players");
    db.run("DELETE FROM sessions", (err) => {
      if (err) {
        console.error("Admin delete-all sessions error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ ok: true });
    });
  });
});

// Delete ALL sessions + all related data (DELETE alias used by UI)
app.delete("/api/admin/sessions", requireAdmin, (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM turns");
    db.run("DELETE FROM state");
    db.run("DELETE FROM players");
    db.run("DELETE FROM sessions", (err) => {
      if (err) {
        console.error("Admin delete-all sessions error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ ok: true });
    });
  });
});

// ==================================================
// PLAYER-FACING APIs
// ==================================================

// --- Character setup APIs ---

app.get("/api/character", (req, res) => {
  db.get(
    "SELECT name, class, background, goal, alignment FROM players WHERE session_id = ?",
    [req.sessionId],
    (err, row) => {
      if (err) {
        console.error(err);
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
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }

      // Initialize basic state if not exists
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

// --- Game turn API ---

app.post("/api/turn", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const reply = await runGameTurn(req.sessionId, message);
    res.json({ reply });
  } catch (e) {
    console.error("DeepSeek error:", e);
    res.status(500).json({ error: "Failed to run game turn" });
  }
});

// --- History API (last ~3 interactions: up to 6 messages) ---

app.get("/api/history", async (req, res) => {
  try {
    // 6 messages ≈ last 3 user+GM exchanges
    const turns = await getTurnsForSession(req.sessionId, 6);
    res.json({ turns });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
});

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", sessionId: req.sessionId });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});