import React from "react";

export function AdminHeader({
  sessionsCount,
  sessionsLoading,
  onLogout
}) {
  return (
    <div
      className="medieval-header"
      style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
    >
      <div>
        <div style={{ fontSize: "1.1rem" }}>Admin: Lower Lands Oracle</div>
        <div className="medieval-stats">
          Sessions: {sessionsCount} {sessionsLoading ? "(loading…)" : ""}
        </div>
      </div>
      <div>
        <button onClick={onLogout}>Leave Admin</button>
      </div>
    </div>
  );
}