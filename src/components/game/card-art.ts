"use client"

import { useEffect, useState } from "react"
import { CardType } from "@/lib/game/cards"

/**
 * Single source of truth for card artwork. Art is PNGs served from
 * `public/card-art/`, keyed by base name and stored in a card's `art` field.
 * Authored at 640x400 (16:10) and drawn full-bleed, so the top quarter of the
 * image sits under the cost pill and type badge — see README.
 */
export const CARD_ART_PATH = "/card-art/"

/** Art every card of a type falls back to until it gets its own piece. */
export const GENERIC_CARD_ART: Record<CardType, string> = {
  [CardType.Attack]: "generic-attack",
  [CardType.Skill]: "generic-skill",
  [CardType.Summon]: "generic-summon",
}

/** Public URL of a piece of art, e.g. "generic-attack" -> "/card-art/generic-attack.png". */
export function cardArtUrl(name: string): string {
  return `${CARD_ART_PATH}${name}.png`
}

/** The art a card should draw: its own if it has one, else its type's generic. */
export function cardArtName(def: { type: CardType; art?: string }): string {
  return def.art || GENERIC_CARD_ART[def.type]
}

/**
 * Selectable art names, discovered from `public/card-art/` via `/api/card-art`.
 * Drop a PNG in that folder and it shows up here on next fetch — no code change.
 */
export function useCardArtNames(): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch("/api/card-art")
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
