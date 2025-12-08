import React from "react";

export function AdminLogin({
  password,
  onPasswordChange,
  onSubmit,
  error
}) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: "3rem auto",
        padding: "1.5rem",
        borderRadius: "8px",
        border: "1px solid #4a3823",
        background: "rgba(5, 5, 10, 0.95)",
        boxShadow: "0 0 20px #000"
      }}
      className="medieval-panel"
    >
      <h2 style={{ marginBottom: "1rem" }}>Admin Gate</h2>
      <p style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>
        Enter the secret phrase to view player sessions and history.
      </p>

      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Admin password
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            style={{ width: "100%", marginTop: 4, marginBottom: 12 }}
            required
          />
        </label>
        {error && (
          <div
            style={{
              color: "#ff6b6b",
              marginBottom: "0.75rem",
              fontSize: "0.9rem"
            }}
          >
            {error}
          </div>
        )}
        <button type="submit" style={{ width: "100%" }}>
          Enter Admin
        </button>
      </form>
    </div>
  );
}