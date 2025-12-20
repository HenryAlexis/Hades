import React from "react";

export function AdminSessionDetails({
  selectedSessionId,
  detailsLoading,
  detailsError,
  sessionDetails
}) {
  return (
    <div
      className="medieval-panel"
      style={{
        flex: 1,
        overflowY: "auto"
      }}
    >
      {!selectedSessionId && (
        <div style={{ color: "#ccc", fontSize: "0.95rem" }}>
          Select a session on the left to inspect the player, state and recent
          history.
        </div>
      )}

      {selectedSessionId && detailsLoading && (
        <div>Loading session details…</div>
      )}

      {detailsError && (
        <div style={{ color: "#ff6b6b", marginBottom: "0.5rem" }}>
          {detailsError}
        </div>
      )}

      {sessionDetails && !detailsLoading && (
        <div style={{ fontSize: "0.95rem" }}>
          {/* Session meta */}
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: 4,
              border: "1px solid #3a2d1a",
              background: "rgba(10, 10, 15, 0.7)",
              fontSize: "0.8rem",
              lineHeight: 1.4
            }}
          >
            <div>
              <strong>Session ID:</strong> {sessionDetails.sessionId}
            </div>
            {sessionDetails.created_at && (
              <div>
                <strong>Created:</strong>{" "}
                {new Date(sessionDetails.created_at).toLocaleString()}
              </div>
            )}
            {sessionDetails.updated_at && (
              <div>
                <strong>Last Activity:</strong>{" "}
                {new Date(sessionDetails.updated_at).toLocaleString()}
              </div>
            )}
          </div>

          {/* Player info */}
          <h3 style={{ marginBottom: "0.5rem" }}>Player</h3>
          <div style={{ marginBottom: "0.75rem" }}>
            <div>
              <strong>Name:</strong>{" "}
              {sessionDetails.player?.name || "Unnamed wanderer"}
            </div>
            <div>
              <strong>Class:</strong>{" "}
              {sessionDetails.player?.class || "—"}
            </div>
            <div>
              <strong>Alignment:</strong>{" "}
              {sessionDetails.player?.alignment || "—"}
            </div>
            <div>
              <strong>Goal:</strong>{" "}
              {sessionDetails.player?.goal || "—"}
            </div>
            <div>
              <strong>Background:</strong>{" "}
              {sessionDetails.player?.background || "—"}
            </div>
          </div>

          {/* State */}
          <h3 style={{ marginBottom: "0.5rem" }}>State</h3>
          <div style={{ marginBottom: "0.75rem" }}>
            <div>
              <strong>Location:</strong>{" "}
              {sessionDetails.state?.location || "Unknown"}
            </div>
            <div>
              <strong>HP:</strong>{" "}
              {sessionDetails.state?.health ?? "—"}
              {"  "}
              <strong>MP:</strong>{" "}
              {sessionDetails.state?.mana ?? "—"}
            </div>
            <div>
              <strong>Gold:</strong>{" "}
              {sessionDetails.state?.gold ?? "—"}
            </div>
            <div>
              <strong>Inventory:</strong>{" "}
              {sessionDetails.state?.inventory || "[]"}
            </div>
          </div>

          {/* Turns */}
          <h3 style={{ marginBottom: "0.5rem" }}>Recent History</h3>
          {(!sessionDetails.turns || sessionDetails.turns.length === 0) && (
            <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
              No turns recorded for this session.
            </div>
          )}
          {sessionDetails.turns &&
            sessionDetails.turns.map((t, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "0.75rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid #3a2d1a"
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.7,
                    marginBottom: "0.2rem"
                  }}
                >
                  {new Date(t.created_at).toLocaleString()} —{" "}
                  <strong>{t.role}</strong>
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "Georgia, 'Times New Roman', serif"
                  }}
                >
                  {t.content}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}