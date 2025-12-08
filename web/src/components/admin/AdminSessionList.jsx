import React from "react";

export function AdminSessionList({
  sessions,
  sessionsLoading,
  sessionsError,
  selectedSessionId,
  deletingSessionId,
  deletingAll,
  onSelectSession,
  onDeleteSession
}) {
  return (
    <div
      className="medieval-panel"
      style={{
        flexBasis: "30%",
        flexShrink: 0,
        overflowY: "auto",
        position: "relative"
      }}
    >
      <div
        style={{
          marginBottom: "0.75rem",
          fontFamily: "MedievalSharp, cursive",
          fontSize: "1.05rem"
        }}
      >
        Sessions
      </div>

      {sessionsError && (
        <div style={{ color: "#ff6b6b", marginBottom: "0.5rem" }}>
          {sessionsError}
        </div>
      )}

      {sessionsLoading && <div>Loading sessions…</div>}

      {!sessionsLoading && sessions.length === 0 && !sessionsError && (
        <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
          No sessions recorded yet.
        </div>
      )}

      {sessions.map((s) => (
        <div
          key={s.session_id}
          onClick={() => onSelectSession(s.session_id)}
          style={{
            position: "relative",
            marginBottom: "0.4rem",
            padding: "0.45rem 0.6rem 0.5rem 0.6rem",
            fontSize: "0.9rem",
            background:
              selectedSessionId === s.session_id
                ? "linear-gradient(#52401e, #3b2a14)"
                : "linear-gradient(#2a1e0f, #1b130b)",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {/* Delete (red X) button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(s.session_id);
            }}
            disabled={deletingSessionId === s.session_id || deletingAll}
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "1px solid #aa3333",
              background: "radial-gradient(circle, #ff5c5c, #7a1010)",
              color: "#fff",
              fontSize: "0.75rem",
              lineHeight: "1",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {deletingSessionId === s.session_id ? "…" : "✕"}
          </button>

          <div>
            <strong>{s.player_name || "Unnamed wanderer"}</strong>{" "}
            <span style={{ opacity: 0.8 }}>
              ({s.player_class || "—"})
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            {s.player_goal || "No goal set"}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              opacity: 0.6,
              marginTop: "0.1rem"
            }}
          >
            {s.session_id}
          </div>
        </div>
      ))}
    </div>
  );
}