// web/src/api.js

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "/api"; // cPanel reverse proxy

async function parseJsonSafe(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  // If server returned HTML (e.g. 404 page), avoid JSON crash
  if (!contentType.includes("application/json")) {
    return {
      error: `Non-JSON response (${res.status}). Check API route/proxy.`,
      status: res.status,
      raw: text?.slice?.(0, 300) || ""
    };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      error: `Invalid JSON response (${res.status}).`,
      status: res.status,
      raw: text?.slice?.(0, 300) || ""
    };
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  const data = await parseJsonSafe(res);

  // Normalize non-2xx into {error}
  if (!res.ok && !data?.error) {
    data.error = `Request failed (${res.status})`;
    data.status = res.status;
  }

  return data;
}

// ---------------- Player-facing APIs ----------------

export function fetchCharacter() {
  return request("/character");
}

export function saveCharacter(payload) {
  return request("/character", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function sendTurn(message) {
  return request("/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
}

// (Future) stats endpoint
export function fetchStats() {
  return request("/stats");
}

export function fetchHistory() {
  return request("/history");
}

// ---------------- Admin APIs ----------------

export function adminLogin(password) {
  return request("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
}

export function adminLogout() {
  return request("/admin/logout", {
    method: "POST"
  });
}

export function fetchAdminStats() {
  return request("/admin/stats");
}

export function fetchAdminSessions() {
  return request("/admin/sessions");
}

export function fetchAdminSessionDetails(sessionId) {
  return request(`/admin/session/${encodeURIComponent(sessionId)}`);
}

export function updateAdminPlayer(sessionId, payload) {
  return request(`/admin/player/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function resetAdminSession(sessionId) {
  return request(`/admin/session/${encodeURIComponent(sessionId)}/reset`, {
    method: "POST"
  });
}

export function deleteAdminSession(sessionId) {
  return request(`/admin/session/${encodeURIComponent(sessionId)}`, {
    method: "DELETE"
  });
}

export function deleteAllAdminSessions() {
  return request("/admin/sessions", {
    method: "DELETE"
  });
}

// ---------------- Admin Lore APIs ----------------

export function fetchAdminLore() {
  return request("/admin/lore");
}

export function createAdminLoreNode(payload) {
  return request("/admin/lore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function updateAdminLoreNode(id, payload) {
  return request(`/admin/lore/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function deleteAdminLoreNode(id) {
  return request(`/admin/lore/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}