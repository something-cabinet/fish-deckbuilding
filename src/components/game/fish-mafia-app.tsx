"use client";

import { useState } from "react";
import type { CardDef } from "@/lib/game/cards";
import { CardCreateScreen } from "./card-create-screen";
import { CardLibraryScreen } from "./card-library-screen";
import { FishMafiaGame } from "./fish-mafia-game";
import { MenuScreen } from "./menu-screen";
import { Screen } from "./screen.enum";

export interface GameSettings {
  /** show teal reachable-tile dots when a unit is selected */
  movementHints: boolean;
  /** render particle bursts and floating combat numbers */
  visualEffects: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  movementHints: true,
  visualEffects: true,
}

export function FishMafiaApp() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  // custom cards authored in the card creator, surfaced in the library
  const [customCards, setCustomCards] = useState<CardDef[]>([]);
  // bumping this key remounts the game for a fresh run on each Start
  const [runKey, setRunKey] = useState(0);

  switch (screen) {
    case Screen.Menu:
      return (
        <MenuScreen
          settings={settings}
          onChangeSettings={setSettings}
          onStart={() => {
            setRunKey((k) => k + 1);
            setScreen(Screen.Game);
          }}
          onOpenLibrary={() => setScreen(Screen.Library)}
          onOpenCreate={() => setScreen(Screen.Create)}
        />
      );
    case Screen.Library:
      return (
        <CardLibraryScreen
          customCards={customCards}
          onBack={() => setScreen(Screen.Menu)}
          onCreate={() => setScreen(Screen.Create)}
        />
      );
    case Screen.Create:
      return (
        <CardCreateScreen
          onBack={() => setScreen(Screen.Library)}
          onSave={(def) => {
            setCustomCards((prev) => [...prev, def]);
            setScreen(Screen.Library);
          }}
        />
      );
    case Screen.Game:
      return (
        <FishMafiaGame
          key={runKey}
          settings={settings}
          onExit={() => setScreen(Screen.Menu)}
        />
      );
    default: {
      return null;
    }
  }
}
