import React, { useState, useEffect } from "react";
import { sendTurn, fetchCharacter, fetchHistory } from "../api";

export function GameView() {
  const [log, setLog] = useState([
    {
      from: "system",
      text: "The fog thickens as you step into the Bleak Marches. A bell tolls in the distance..."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // player + stats
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState({
    location: "The Bleak Marches outskirts",
    health: 100,
    mana: 50,
    gold: 0
  });

  useEffect(() => {
    (async () => {
      try {
        // Load character + last history in parallel
        const [character, historyData] = await Promise.all([
          fetchCharacter(),
          fetchHistory()
        ]);

        if (character) {
          setPlayer(character);
        }

        if (historyData && Array.isArray(historyData.turns) && historyData.turns.length > 0) {
          // Map DB roles to UI roles
          const mappedLog = historyData.turns.map((t) => ({
            from:
              t.role === "user"
                ? "you"
                : t.role === "assistant"
                ? "gm"
                : "system",
            text: t.content
          }));
          setLog(mappedLog);
        }
        // if no history, we keep the initial system intro in state
      } catch (err) {
        console.error("Failed to load character or history:", err);
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const playerText = input.trim();
    setInput("");

    setLog((prev) => [...prev, { from: "you", text: playerText }]);
    setLoading(true);
    try {
      const res = await sendTurn(playerText);
      setLog((prev) => [...prev, { from: "gm", text: res.reply }]);

      // In the future you can update stats here if the server returns them,
      // e.g. setStats(res.stats)
    } catch (e) {
      console.error(e);
      setLog((prev) => [
        ...prev,
        { from: "system", text: "Something went wrong talking to the GM." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "3rem auto",
        padding: "1.5rem",
        borderRadius: "10px",
        border: "1px solid #4a3823",
        background: "rgba(5, 5, 10, 0.9)",
        boxShadow: "0 0 25px #000",
        display: "flex",
        flexDirection: "column",
        height: "80vh"
      }}
    >
      {/* Header with welcome + stats */}
      <div className="medieval-header">
        <div style={{ fontSize: "1.2rem" }}>
          Welcome:{" "}
          <span style={{ color: "#ffd37a" }}>
            {player?.name || "Unknown wanderer"}
          </span>
        </div>
        <div className="medieval-stats">
          Location: {stats.location} &nbsp;|&nbsp; HP: {stats.health} &nbsp;|&nbsp; MP:{" "}
          {stats.mana} &nbsp;|&nbsp; Gold: {stats.gold}
        </div>
      </div>

      {/* Log window */}
      <div
        className="medieval-panel"
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "1rem",
          background:
            "radial-gradient(circle at top left, #221811 0, #0b0b12 55%, #050509 100%)"
        }}
      >
        {log.map((entry, i) => (
          <div
            key={i}
            style={{
              marginBottom: "0.75rem",
              whiteSpace: "pre-wrap"
            }}
          >
            <strong
              style={{
                color:
                  entry.from === "you"
                    ? "#c6ffdd"
                    : entry.from === "gm"
                    ? "#ffb347"
                    : "#8b8280"
              }}
            >
              {entry.from === "you"
                ? "You"
                : entry.from === "gm"
                ? "Game Master"
                : "System"}
              :
            </strong>{" "}
            {entry.text}
          </div>
        ))}
        {loading && (
          <div style={{ marginTop: "0.5rem", color: "#d6c7a3" }}>
            The Game Master is pondering your fate...
          </div>
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak your choice... (e.g. '1' or 'Approach the witch')"
          style={{
            flex: 1
          }}
        />
        <button type="submit" disabled={loading}>
          Cast Choice
        </button>
      </form>
    </div>
  );
}