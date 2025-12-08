const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "/api"; // cPanel reverse proxy

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