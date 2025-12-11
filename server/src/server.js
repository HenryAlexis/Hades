// server/src/server.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import { playerSessionMiddleware } from "./middleware/playerSession.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { playerRouter } from "./routes/playerRoutes.js";

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

// -----------------------------------------------
// PLAYER SESSION MIDDLEWARE
// (sets req.sessionId for non-admin / non-health routes)
// -----------------------------------------------
app.use(playerSessionMiddleware);

// -----------------------------------------------
// ROUTES
// -----------------------------------------------

// All admin endpoints under /api/admin
app.use("/api/admin", adminRouter);

// Player-facing game APIs under /api
app.use("/api", playerRouter);

// -----------------------------------------------
// SERVER START
// -----------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});