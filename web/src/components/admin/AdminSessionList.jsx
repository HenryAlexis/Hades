import React from "react";

export function AdminSessionList({
  sessions,
  sessionsLoading,
  sessionsError,
  selectedSessionId,
  deletingSessionId,
  deletingAll,
  mode = "live", // "dummy" | "live"
  onSelectSession,
  onDeleteSession,
  onDeleteAllSessions
}) {
  return (
    <div
      className="medieval-panel"
      style={{
        flexBasis: "30%",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        overflow: "hidden"
      }}
    >
      {/* Header row */}
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8
        }}
      >
        <div
          style={{
            fontFamily: "MedievalSharp, cursive",
            fontSize: "1.05rem"
          }}
        >
          Sessions
        </div>

        <div
          style={{
            fontSize: "0.7rem",
            padding: "2px 6px",
            borderRadius: "999px",
            border: "1px solid #4a3823",
            background:
              mode === "dummy"
                ? "rgba(150, 80, 40, 0.3)"
                : "rgba(40, 120, 60, 0.25)",
            color: mode === "dummy" ? "#ffd3b0" : "#c6ffd3"
          }}
        >
          {mode === "dummy" ? "DUMMY DATA" : "LIVE DATA"}
        </div>
      </div>

      {sessionsError && (
        <div style={{ color: "#ff6b6b", marginBottom: "0.5rem" }}>
          {sessionsError}
        </div>
      )}

      {sessionsLoading && (
        <div style={{ marginBottom: "0.5rem" }}>Loading sessions…</div>
      )}

      {!sessionsLoading && sessions.length === 0 && !sessionsError && (
        <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
          No sessions recorded yet.
        </div>
      )}

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "0.25rem",
          marginBottom: "0.75rem"
        }}
      >
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
              <span style={{ opacity: 0.8 }}>({s.player_class || "—"})</span>
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
            {s.created_at && (
              <div
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.6,
                  marginTop: "0.1rem"
                }}
              >
                Created:{" "}
                {new Date(s.created_at).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short"
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Remove all button */}
      {onDeleteAllSessions && (
        <button
          type="button"
          onClick={onDeleteAllSessions}
          disabled={deletingAll}
          style={{
            width: "100%",
            background: "linear-gradient(#5a1515, #2a0707)",
            borderColor: "#c23b3b"
          }}
        >
          {deletingAll ? "Removing ALL…" : "Remove ALL Sessions"}
        </button>
      )}
    </div>
  );
}