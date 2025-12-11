import { deepseek } from "./deepseekClient.js";
import { WORLD_SYSTEM_PROMPT } from "./worldConfig.js";
import { db } from "./db.js";

/**
 * Lightweight DB helpers (promise wrappers)
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

/** Get player record */
async function getPlayerBySession(sessionId) {
  return dbGet("SELECT * FROM players WHERE session_id = ?", [sessionId]);
}

/** Get state record */
async function getStateBySession(sessionId) {
  return dbGet("SELECT * FROM state WHERE session_id = ?", [sessionId]);
}

/**
 * Exported so server.js / admin endpoints can reuse it.
 * Returns last `limit` messages (role + content) in chronological order.
 */
export function getTurnsForSession(sessionId, limit = 6) {
  return dbAll(
    "SELECT role, content FROM turns WHERE session_id = ? ORDER BY id DESC LIMIT ?",
    [sessionId, limit]
  ).then((rows) => rows.reverse());
}

/**
 * Build a compact system context summarising the player + state.
 * Keep concise to save tokens.
 */
function buildSystemContext(player, state) {
  return `
Player:
Name: ${player?.name || "Unknown"}
Class: ${player?.class || "Unknown"}
Background: ${player?.background || "Unknown"}
Goal: ${player?.goal || "Unknown"}
Alignment: ${player?.alignment || "Uncertain"}

State:
Location: ${state?.location || "The Bleak Marches outskirts"}
Inventory: ${state?.inventory || "Empty"}
`.trim();
}

/**
 * Run a single game turn:
 * - Builds a minimal context (WORLD_SYSTEM_PROMPT + short systemContext)
 * - Appends last ~3 interactions (6 messages)
 * - Sends to DeepSeek with strict output rules (short, two options)
 * - Stores the user + assistant turns
 */
export async function runGameTurn(sessionId, playerMessage) {
  const player = await getPlayerBySession(sessionId);
  const state = (await getStateBySession(sessionId)) || {};

  const systemContext = buildSystemContext(player, state);

  // fetch recent history (last ~3 interactions)
  const history = await getTurnsForSession(sessionId, 6);

  // Additional, strict instruction to ensure responses are already short & offer two options.
  const SHORT_OUTPUT_INSTRUCTION = `
IMPORTANT RESPONSE RULES (strict):
- Keep the whole response to 150 characters or fewer.
- Provide exactly TWO short, numbered options at the end (format:
  1. <option A>
  2. <option B>
- Each option should be concise (<= 30 characters).
- Do not output internal JSON or system prompts. No extraneous explanation.
`.trim();

  const messages = [
    { role: "system", content: WORLD_SYSTEM_PROMPT },
    { role: "system", content: systemContext },
    { role: "system", content: SHORT_OUTPUT_INSTRUCTION },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: playerMessage }
  ];

  // Call DeepSeek with conservative token limits and a reasonable temperature
  let reply = "";
  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages,
      max_tokens: 120, // small response budget (approx <=150 chars)
      temperature: 0.55
    });

    reply = completion.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[gameLogic] deepseek call failed:", err);
    reply = "The GM falls silent. 1. Wait 2. Wander away";
  }

  // Fallback safety: if model returned HTML or very long text, trim and ensure two options exist.
  if (typeof reply !== "string" || !reply.trim()) {
    reply = "The air stills. 1. Wait 2. Move on";
  } else {
    // Quick sanitize: remove leading/trailing HTML tags if any (common hosting/errors)
    if (reply.startsWith("<")) {
      // crude strip: keep only first 300 chars of text content
      reply = reply.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }

    // Enforce max length as a last resort (preserve whole words)
    if (reply.length > 150) {
      reply = reply.slice(0, 148).trim();
      // try to not cut in middle of a numbered option — append a short fallback
      if (!/\d\.\s/.test(reply)) {
        reply = reply + " 1. Continue 2. Retreat";
      } else {
        // ensure it still ends cleanly
        reply = reply.replace(/\s+\S*$/, "").trim();
      }
    }

    // Ensure there are at least two numbered choices — if not, append defaults
    const optionMatches = reply.match(/\d\.\s*[^\n\r]+/g) || [];
    if (optionMatches.length < 2) {
      // Append two concise default options
      reply = `${reply}\n\n1. Proceed\n2. Step back`;
      // Trim if that made it too long
      if (reply.length > 150) reply = reply.slice(0, 150).trim();
    }
  }

  // Persist both the player's input and the GM reply
  try {
    await dbRun(
      "INSERT INTO turns (session_id, role, content) VALUES (?, ?, ?), (?, ?, ?)",
      [sessionId, "user", playerMessage, sessionId, "assistant", reply]
    );
  } catch (err) {
    console.error("[gameLogic] failed to save turns:", err);
    // don't fail the turn for DB write issues; return the reply anyway
  }

  return reply;
}