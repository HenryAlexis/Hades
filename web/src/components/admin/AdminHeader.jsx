// web/src/components/admin/AdminHeader.jsx
import React from "react";

export function AdminHeader({
  stats,
  statsLoading,
  sessionsCount,
  sessionsLoading,
  onRefreshStats,
  onLogout,
  view // "sessions" | "lore"
}) {
  return (
    <div
      className="medieval-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16
      }}
    >
      {/* LEFT SIDE */}
      <div>
        <div style={{ fontSize: "1.1rem" }}>
          Admin: Lower Lands Oracle
        </div>

        {/* Current section indicator */}
        <div
          style={{
            fontSize: "0.85rem",
            opacity: 0.8,
            marginTop: 2
          }}
        >
          Section:{" "}
          <strong>
            {view === "lore" ? "Lore Editor" : "Sessions"}
          </strong>
        </div>

        {/* Sessions info */}
        <div className="medieval-stats" style={{ marginTop: 4 }}>
          Sessions: {sessionsCount}
          {sessionsLoading ? " (loading…)" : ""}
        </div>

        {/* Optional global stats */}
        {stats && (
          <div
            className="medieval-stats"
            style={{
              marginTop: 6,
              opacity: 0.85,
              fontSize: "0.85rem"
            }}
          >
            {"totalSessions" in stats && (
              <div>Total Sessions Ever: {stats.totalSessions}</div>
            )}
            {"activeToday" in stats && (
              <div>Active Today: {stats.activeToday}</div>
            )}
            {"mode" in stats && (
              <div>
                Mode: {stats.mode === "dummy" ? "Dummy Data" : "Live Data"}
              </div>
            )}
          </div>
        )}

        {statsLoading && (
          <div
            style={{
              fontSize: "0.8rem",
              opacity: 0.7,
              marginTop: 4
            }}
          >
            Updating stats…
          </div>
        )}
      </div>

      {/* RIGHT SIDE ACTIONS */}
      <div style={{ display: "flex", gap: 10 }}>
        {onRefreshStats && (
          <button onClick={onRefreshStats}>
            Refresh Stats
          </button>
        )}
        <button onClick={onLogout}>
          Leave Admin
        </button>
      </div>
    </div>
  );
}