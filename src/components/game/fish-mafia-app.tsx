"use client"

import { useState } from "react"
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

type Screen = "menu" | "game"

export function FishMafiaApp() {
  const [screen, setScreen] = useState<Screen>("menu")
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
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
