const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "/api"; // cPanel reverse proxy

// ---------------- Player-facing APIs ----------------

// Fetch player character (name, class, background, etc.)
export async function fetchCharacter() {
  const res = await fetch(`${API_BASE}/character`, {
    credentials: "include"
  });
  return res.json();
}

// Save or update character data
export async function saveCharacter(payload) {
  const res = await fetch(`${API_BASE}/character`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Send a turn message to backend (player choice)
export async function sendTurn(message) {
  const res = await fetch(`${API_BASE}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message })
  });
  return res.json();
}

// Fetch player stats (Future)
export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`, {
    credentials: "include"
  });
  return res.json();
}

// Fetch last ~3 interactions (up to 6 messages)
export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/history`, {
    credentials: "include"
  });
  return res.json();
}

// ---------------- Admin APIs ----------------

// Log in as admin with a single password
export async function adminLogin(password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password })
  });

  return res.json();
}

// Log out admin (clear admin cookie)
export async function adminLogout() {
  const res = await fetch(`${API_BASE}/admin/logout`, {
    method: "POST",
    credentials: "include"
  });
  return res.json();
}

// Get global admin stats for dashboard header
export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    credentials: "include"
  });
  return res.json();
}

// Get list of sessions + basic player info
export async function fetchAdminSessions() {
  const res = await fetch(`${API_BASE}/admin/sessions`, {
    credentials: "include"
  });
  return res.json();
}

// Get details for a single session (player, state, turns)
export async function fetchAdminSessionDetails(sessionId) {
  const res = await fetch(
    `${API_BASE}/admin/session/${encodeURIComponent(sessionId)}`,
    {
      credentials: "include"
    }
  );
  return res.json();
}

// Update player profile fields for a given session
export async function updateAdminPlayer(sessionId, payload) {
  const res = await fetch(
    `${API_BASE}/admin/player/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    }
  );
  return res.json();
}

// Reset session story (delete turns + state, keep player)
export async function resetAdminSession(sessionId) {
  const res = await fetch(
    `${API_BASE}/admin/session/${encodeURIComponent(sessionId)}/reset`,
    {
      method: "POST",
      credentials: "include"
    }
  );
  return res.json();
}

// Delete a single session + related data
export async function deleteAdminSession(sessionId) {
  const res = await fetch(
    `${API_BASE}/admin/session/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      credentials: "include"
    }
  );
  return res.json();
}

// Delete ALL sessions + related data
export async function deleteAllAdminSessions() {
  const res = await fetch(`${API_BASE}/admin/sessions`, {
    method: "DELETE",
    credentials: "include"
  });
  return res.json();
}