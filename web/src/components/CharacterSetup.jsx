import React, { useState, useEffect, useRef } from "react";
import { fetchCharacter, saveCharacter, fetchPersonalitySuggestions } from "../api";

export function CharacterSetup({ onDone }) {
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [background, setBackground] = useState("");
  const [personality, setPersonality] = useState("");
  const [saving, setSaving] = useState(false);
  const [personalitySuggestions, setPersonalitySuggestions] = useState([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [suggError, setSuggError] = useState("");
  const suggTimerRef = useRef(null);
  const suggAbortRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchCharacter();
      if (data) {
        setName(data.name || "");
        setBackground(data.background || "");
        setPersonality(data.personality || "");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await saveCharacter({ name, background, personality });
    setSaving(false);
    onDone();
  }

  // Personality suggestion fetcher (debounced)
  function handlePersonalityChange(value) {
    setPersonality(value);
    setSuggError("");
    setPersonalitySuggestions([]);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      if (suggTimerRef.current) clearTimeout(suggTimerRef.current);
      if (suggAbortRef.current) suggAbortRef.current.abort();
      setSuggLoading(false);
      return;
    }

    if (suggTimerRef.current) clearTimeout(suggTimerRef.current);
    suggTimerRef.current = setTimeout(async () => {
      if (suggAbortRef.current) suggAbortRef.current.abort();
      const controller = new AbortController();
      suggAbortRef.current = controller;
      setSuggLoading(true);
      try {
        const res = await fetchPersonalitySuggestions(trimmed, { signal: controller.signal });
        if (res?.error) {
          setSuggError(res.error);
          setPersonalitySuggestions([]);
        } else {
          setPersonalitySuggestions(res);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSuggError("Failed to load suggestions");
        }
      } finally {
        setSuggLoading(false);
      }
    }, 500);
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
          Inscribe your name and intent before stepping into the Bleak Marches.
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
            Personality <span style={{ fontSize: "0.8rem", color: "#c9b896" }}>
              (how do you face the world?)
            </span>
          </label>
          <textarea
            value={personality}
            onChange={(e) => handlePersonalityChange(e.target.value)}
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.45rem 0.55rem",
              border: "1px solid #4a3823",
              borderRadius: 8,
              background: "rgba(20, 14, 8, 0.55)"
            }}
          >
            <div style={{ fontSize: "0.9rem", color: "#e7d7b0", marginBottom: "0.25rem" }}>
              Examples
            </div>
            {suggLoading && (
              <div style={{ fontSize: "0.85rem", color: "#d9c7a0" }}>Thinking…</div>
            )}
            {suggError && (
              <div style={{ fontSize: "0.85rem", color: "#ff9b8c" }}>{suggError}</div>
            )}
            {!suggLoading && !suggError && personalitySuggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {personalitySuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPersonality(s)}
                    style={{
                      border: "1px solid #4a3823",
                      background: "linear-gradient(#3b2a14, #24170b)",
                      color: "#f3e6d0",
                      padding: "2px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      boxShadow: "0 1px 0 rgba(0,0,0,0.4)"
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {!suggLoading && !suggError && personalitySuggestions.length === 0 && (
              <div style={{ fontSize: "0.85rem", color: "#bcae8c", opacity: 0.8 }}>
                Type a few words to see ideas.
              </div>
            )}
          </div>
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
