"use client"

import { useEffect, useState } from "react"

/**
 * Single source of truth for unit artwork. Sprites are PNGs served from
 * `public/sprites/`, keyed by base name — both enemies and playable characters
 * store that base name in their `icon` field.
 */
export const SPRITE_PATH = "/sprites/"

/** Public URL of a sprite, e.g. "hero" -> "/sprites/hero.png". */
export function spriteUrl(name: string): string {
  return `${SPRITE_PATH}${name}.png`
}

/** Stand-in sprites for units that have no art of their own yet. */
export const PLACEHOLDER_SPRITE = {
  enemy: "placeholder-enemy",
  player: "placeholder-player",
  summon: "placeholder-summon",
} as const

/**
 * Selectable sprite names, discovered from `public/sprites/` via `/api/sprites`.
 * Drop a PNG in that folder and it shows up here on next fetch — no code change.
 */
export function useSpriteNames(): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch("/api/sprites")
      .then((res) => res.json())
      .then((data: string[]) => {
        if (!cancelled) setNames(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return names
}
