import React from "react";

export function AdminHeader({
  stats,
  statsLoading,
  sessionsCount,
  sessionsLoading,
  onRefreshStats,
  onLogout
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
      <div>
        <div style={{ fontSize: "1.1rem" }}>Admin: Lower Lands Oracle</div>

        {/* Sessions info */}
        <div className="medieval-stats">
          Sessions: {sessionsCount} {sessionsLoading ? "(loading…)" : ""}
        </div>

        {/* Global stats if available */}
        {stats && (
          <div
            className="medieval-stats"
            style={{ marginTop: 4, opacity: 0.85, fontSize: "0.85rem" }}
          >
            <div>Total Sessions Ever: {stats.totalSessions}</div>
            <div>Active Today: {stats.activeToday}</div>
            <div>Mode: {stats.mode === "dummy" ? "Dummy Data" : "Live Data"}</div>
          </div>
        )}

        {statsLoading && (
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Updating stats…</div>
        )}
      </div>

      {/* Right side buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onRefreshStats}>Refresh Stats</button>
        <button onClick={onLogout}>Leave Admin</button>
      </div>
    </div>
  );
}