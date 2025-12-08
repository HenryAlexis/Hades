import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
import { runGameTurn } from "./gameLogic.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());

// For local dev with React running on a different port
app.use(
  cors({
    origin: "http://localhost:5173", // adjust for your front-end URL
    credentials: true
  })
);

// --- Session middleware (cookie-based) ---

app.use((req, res, next) => {
  let sessionId = req.cookies.session_id;

  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // enable in production with https
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });

    db.run(
      "INSERT OR IGNORE INTO sessions (id) VALUES (?)",
      [sessionId],
      (err) => {
        if (err) console.error("Error inserting session:", err);
      }
    );
  }

  req.sessionId = sessionId;
  next();
});

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

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", sessionId: req.sessionId });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});