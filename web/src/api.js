const API_BASE = "http://localhost:3001"; // change to your domain for cPanel

// Fetch player character (name, class, background, etc.)
export async function fetchCharacter() {
  const res = await fetch(`${API_BASE}/api/character`, {
    credentials: "include"
  });
  return res.json();
}

// Save or update character data
export async function saveCharacter(payload) {
  const res = await fetch(`${API_BASE}/api/character`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Send a turn message to backend (player choice)
export async function sendTurn(message) {
  const res = await fetch(`${API_BASE}/api/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message })
  });

  return res.json();
}

// (Optional Future Feature)
// Fetch player stats (HP, MP, Gold, Location)
// This will become active once backend returns real stats.
export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`, {
    credentials: "include"
  });
  return res.json();
}