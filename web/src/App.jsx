import React, { useState, useEffect } from "react";
import { CharacterSetup } from "./components/CharacterSetup";
import { GameView } from "./components/GameView";
import { fetchCharacter } from "./api";
import { AdminView } from "./components/admin/AdminView";

export default function App() {
  const [hasCharacter, setHasCharacter] = useState(null);

  // Very simple routing: if URL path contains "/admin", show admin panel
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.toLowerCase().includes("/admin");

  useEffect(() => {
    if (isAdminRoute) return; // no need to load player character on admin
    (async () => {
      const data = await fetchCharacter();
      setHasCharacter(!!data);
    })();
  }, [isAdminRoute]);

  // If we're on /admin, render admin panel instead of game
  if (isAdminRoute) {
    return <AdminView />;
  }

  if (hasCharacter === null) return <div>Loading...</div>;

  if (!hasCharacter)
    return <CharacterSetup onDone={() => setHasCharacter(true)} />;

  return <GameView />;
}