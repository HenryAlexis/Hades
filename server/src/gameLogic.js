import { deepseek } from "./deepseekClient.js";
import { WORLD_SYSTEM_PROMPT } from "./worldConfig.js";
import { db } from "./db.js";

function getPlayerBySession(sessionId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM players WHERE session_id = ?",
      [sessionId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function getStateBySession(sessionId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM state WHERE session_id = ?",
      [sessionId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function getTurnsForSession(sessionId, limit = 20) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT role, content FROM turns WHERE session_id = ? ORDER BY id DESC LIMIT ?",
      [sessionId, limit],
      (err, rows) => (err ? reject(err) : resolve(rows.reverse()))
    );
  });
}

export async function runGameTurn(sessionId, playerMessage) {
  const player = await getPlayerBySession(sessionId);
  const state = (await getStateBySession(sessionId)) || {};

  // short dynamic context (kept minimal to save tokens)
  const systemContext = `
Player:
Name: ${player?.name || "Unknown"}
Class: ${player?.class || "Unknown"}
Background: ${player?.background || "Unknown"}
Goal: ${player?.goal || "Unknown"}
Alignment: ${player?.alignment || "Uncertain"}

State:
Location: ${state.location || "The Bleak Marches outskirts"}
HP: ${state.health ?? 100}
MP: ${state.mana ?? 50}
Gold: ${state.gold ?? 0}
Inventory: ${state.inventory || "Empty"}

GM MUST follow output rules already defined.
`.trim();

  const history = await getTurnsForSession(sessionId, 10); // cut from 20 → cheaper

  const messages = [
    { role: "system", content: WORLD_SYSTEM_PROMPT }, // includes short-output rules now
    { role: "system", content: systemContext },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: playerMessage }
  ];

  // DeepSeek response with strict token limits
  const completion = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages,
    max_tokens: 60,           // keeps responses tiny and cheap
    temperature: 0.6
  });

  const reply = completion.choices[0].message.content;

  // store turns
  await new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO turns (session_id, role, content) VALUES (?, ?, ?), (?, ?, ?)",
      [sessionId, "user", playerMessage, sessionId, "assistant", reply],
      (err) => (err ? reject(err) : resolve())
    );
  });

  return reply;
}