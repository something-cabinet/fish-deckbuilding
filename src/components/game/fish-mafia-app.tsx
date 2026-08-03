"use client"

import { useState } from "react"
import type { CardDef } from "@/lib/game/cards"
import { CardCreateScreen } from "./card-create-screen"
import { CardLibraryScreen } from "./card-library-screen"
import { FishMafiaGame } from "./fish-mafia-game"
import { MenuScreen } from "./menu-screen"

export interface GameSettings {
  /** show teal reachable-tile dots when a unit is selected */
  movementHints: boolean
  /** render particle bursts and floating combat numbers */
  visualEffects: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  movementHints: true,
  visualEffects: true,
}

type Screen = "menu" | "game" | "library" | "create"

export function FishMafiaApp() {
  const [screen, setScreen] = useState<Screen>("menu")
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  // custom cards authored in the card creator, surfaced in the library
  const [customCards, setCustomCards] = useState<CardDef[]>([])
  // bumping this key remounts the game for a fresh run on each Start
  const [runKey, setRunKey] = useState(0)

  if (screen === "menu") {
    return (
      <MenuScreen
        settings={settings}
        onChangeSettings={setSettings}
        onStart={() => {
          setRunKey((k) => k + 1)
          setScreen("game")
        }}
        onOpenLibrary={() => setScreen("library")}
        onOpenCreate={() => setScreen("create")}
      />
    )
  }

  if (screen === "library") {
    return (
      <CardLibraryScreen
        customCards={customCards}
        onBack={() => setScreen("menu")}
        onCreate={() => setScreen("create")}
      />
    )
  }

  if (screen === "create") {
    return (
      <CardCreateScreen
        onBack={() => setScreen("library")}
        onSave={(def) => {
          setCustomCards((prev) => [...prev, def])
          setScreen("library")
        }}
      />
    )
  }

  return (
    <FishMafiaGame
      key={runKey}
      settings={settings}
      onExit={() => setScreen("menu")}
    />
  )
}
