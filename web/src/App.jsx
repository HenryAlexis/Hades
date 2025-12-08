import React, { useState, useEffect } from "react";
import { CharacterSetup } from "./components/CharacterSetup";
import { GameView } from "./components/GameView";
import { fetchCharacter } from "./api";

export default function App() {
  const [hasCharacter, setHasCharacter] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await fetchCharacter();
      setHasCharacter(!!data);
    })();
  }, []);

  if (hasCharacter === null) return <div>Loading...</div>;

  if (!hasCharacter)
    return <CharacterSetup onDone={() => setHasCharacter(true)} />;

  return <GameView />;
}