import React, { useState, useEffect } from "react";
import { fetchCharacter, saveCharacter } from "../api";

export function CharacterSetup({ onDone }) {
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [playerClass, setPlayerClass] = useState("warrior");
  const [background, setBackground] = useState("");
  const [goal, setGoal] = useState("");
  const [alignment, setAlignment] = useState("neutral");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchCharacter();
      if (data) {
        setName(data.name || "");
        setPlayerClass(data.class || "warrior");
        setBackground(data.background || "");
        setGoal(data.goal || "");
        setAlignment(data.alignment || "neutral");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await saveCharacter({ name, playerClass, background, goal, alignment });
    setSaving(false);
    onDone();
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 500,
          margin: "3rem auto",
          textAlign: "center",
          color: "#f0e6d2",
          fontFamily: "'IM Fell English', serif"
        }}
      >
        The scribes are preparing your fate...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "3rem auto",
        padding: "1.75rem",
        borderRadius: "10px",
        border: "1px solid #4a3823",
        background: "rgba(5, 5, 10, 0.92)",
        boxShadow: "0 0 25px #000"
      }}
    >
      <div className="medieval-header">
        <div style={{ fontSize: "1.3rem" }}>Forge Your Legend</div>
        <div className="medieval-stats">
          Inscribe your name, class and intent before stepping into the Bleak Marches.
        </div>
      </div>

      <form className="medieval-panel" onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Class
          </label>
          <select
            value={playerClass}
            onChange={(e) => setPlayerClass(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="warrior">Warrior</option>
            <option value="mage">Mage</option>
            <option value="rogue">Rogue</option>
            <option value="witch">Witch</option>
            <option value="cleric">Cleric</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Background <span style={{ fontSize: "0.8rem", color: "#c9b896" }}>
              (where do you come from?)
            </span>
          </label>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Goal <span style={{ fontSize: "0.8rem", color: "#c9b896" }}>
              (what do you seek?)
            </span>
          </label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Alignment
          </label>
          <select
            value={alignment}
            onChange={(e) => setAlignment(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="lawful good">Lawful Good</option>
            <option value="neutral">Neutral</option>
            <option value="chaotic good">Chaotic Good</option>
            <option value="lawful evil">Lawful Evil</option>
            <option value="chaotic evil">Chaotic Evil</option>
          </select>
        </div>

        <div style={{ textAlign: "right" }}>
          <button type="submit" disabled={saving}>
            {saving ? "Binding your fate..." : "Step into the Marches"}
          </button>
        </div>
      </form>
    </div>
  );
}