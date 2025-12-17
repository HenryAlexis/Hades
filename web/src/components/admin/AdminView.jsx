import React, { useState, useEffect } from "react";
import {
  adminLogin,
  adminLogout,
  fetchAdminSessions,
  fetchAdminSessionDetails,
  deleteAdminSession,
  deleteAllAdminSessions
} from "../../api";

import { AdminLogin } from "./AdminLogin";
import { AdminHeader } from "./AdminHeader";
import { AdminSessionList } from "./AdminSessionList";
import { AdminSessionDetails } from "./AdminSessionDetails";
import { AdminLoreView } from "./lore/AdminLoreView";

export function AdminView() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [loginError, setLoginError] = useState("");

  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // which admin view is active
  const [view, setView] = useState("sessions"); // "sessions" | "lore"

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await adminLogin(password);
      if (res && res.ok) {
        setIsAuthed(true);
        setPassword("");
        await loadSessions();
      } else {
        setLoginError(res?.error || "Invalid password");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setLoginError("Unable to log in");
    }
  }

  async function handleLogout() {
    try {
      await adminLogout();
    } catch (e) {
      console.error("Admin logout error:", e);
    }
    setIsAuthed(false);
    setSessions([]);
    setSelectedSessionId(null);
    setSessionDetails(null);
    setView("sessions");
  }

  async function loadSessions() {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const res = await fetchAdminSessions();
      if (res.error) {
        if (res.error === "Not authenticated as admin") {
          setIsAuthed(false);
        }
        setSessionsError(res.error);
      } else {
        setSessions(res.sessions || []);
      }
    } catch (err) {
      console.error("Fetch admin sessions error:", err);
      setSessionsError("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }

  async function loadSessionDetails(sessionId) {
    setSelectedSessionId(sessionId);
    setDetailsLoading(true);
    setDetailsError("");
    setSessionDetails(null);
    try {
      const res = await fetchAdminSessionDetails(sessionId);
      if (res.error) {
        setDetailsError(res.error);
      } else {
        setSessionDetails(res);
      }
    } catch (err) {
      console.error("Fetch admin session details error:", err);
      setDetailsError("Failed to load session details");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (deletingAll || deletingSessionId) return;
    if (!window.confirm("Delete this session and all its data?")) return;

    setDeletingSessionId(sessionId);
    setSessionsError("");
    try {
      const res = await deleteAdminSession(sessionId);
      if (res.error) {
        setSessionsError(res.error);
      } else {
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
          setSessionDetails(null);
        }
      }
    } catch (err) {
      console.error("Delete session error:", err);
      setSessionsError("Failed to delete session");
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function handleDeleteAllSessions() {
    if (
      !sessions.length ||
      deletingAll ||
      !window.confirm(
        "This will remove ALL sessions and their data from the database. Proceed?"
      )
    ) {
      return;
    }

    setDeletingAll(true);
    setSessionsError("");
    try {
      const res = await deleteAllAdminSessions();
      if (res.error) {
        setSessionsError(res.error);
      } else {
        setSessions([]);
        setSelectedSessionId(null);
        setSessionDetails(null);
      }
    } catch (err) {
      console.error("Delete ALL sessions error:", err);
      setSessionsError("Failed to delete all sessions");
    } finally {
      setDeletingAll(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAdminSessions();
        if (!res.error) {
          setIsAuthed(true);
          setSessions(res.sessions || []);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  if (!isAuthed) {
    return (
      <AdminLogin
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        error={loginError}
      />
    );
  }

  const navBtnStyle = (active) => ({
    background: active
      ? "linear-gradient(#52401e, #3b2a14)"
      : "linear-gradient(#2a1e0f, #1b130b)",
    border: "1px solid #4a3823",
    color: "#f5e7d2",
    padding: "0.45rem 0.75rem",
    borderRadius: 6,
    cursor: active ? "default" : "pointer",
    opacity: active ? 1 : 0.9
  });

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "2rem auto",
        padding: "1rem",
        borderRadius: "10px",
        border: "1px solid #4a3823",
        background: "rgba(5, 5, 10, 0.95)",
        boxShadow: "0 0 25px #000",
        display: "flex",
        flexDirection: "column",
        height: "80vh"
      }}
    >
      <AdminHeader
        sessionsCount={sessions.length}
        sessionsLoading={sessionsLoading}
        onLogout={handleLogout}
        view={view}
      />

      {/* ADMIN NAV */}
      <div style={{ margin: "0.75rem 0", display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setView("sessions")}
          disabled={view === "sessions"}
          style={navBtnStyle(view === "sessions")}
        >
          Sessions
        </button>
        <button
          type="button"
          onClick={() => setView("lore")}
          disabled={view === "lore"}
          style={navBtnStyle(view === "lore")}
        >
          Write Lore
        </button>
      </div>

      {view === "sessions" && (
        <>
          <div style={{ display: "flex", flex: 1, gap: "1rem", minHeight: 0 }}>
            <AdminSessionList
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              sessionsError={sessionsError}
              selectedSessionId={selectedSessionId}
              deletingSessionId={deletingSessionId}
              deletingAll={deletingAll}
              onSelectSession={loadSessionDetails}
              onDeleteSession={handleDeleteSession}
            />

            <AdminSessionDetails
              selectedSessionId={selectedSessionId}
              detailsLoading={detailsLoading}
              detailsError={detailsError}
              sessionDetails={sessionDetails}
            />
          </div>

          <div style={{ marginTop: "0.75rem", textAlign: "right" }}>
            <button
              type="button"
              onClick={handleDeleteAllSessions}
              disabled={sessions.length === 0 || deletingAll}
              style={{
                background: "linear-gradient(#5b1010, #3b0505)",
                border: "1px solid #ff6666",
                color: "#ffe3e3"
              }}
            >
              {deletingAll ? "Purging all sessions…" : "Remove all sessions"}
            </button>
          </div>
        </>
      )}

      {view === "lore" && <AdminLoreView />}
    </div>
  );
}