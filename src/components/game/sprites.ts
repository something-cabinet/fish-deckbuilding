/**
 * Single source of truth for unit artwork. Sprites are PNGs served from
 * `public/sprites/`, keyed by base name — both enemies and playable characters
 * store that base name in their `icon` field.
 */
export const SPRITE_PATH = "/sprites/"

/** Ordered list of selectable sprites, shared by the enemy and character designers. */
export const SPRITE_NAMES = ["hero", "thug", "enforcer", "boss", "goon"] as const

export type SpriteName = (typeof SPRITE_NAMES)[number]

/** Public URL of a sprite, e.g. "hero" -> "/sprites/hero.png". */
export function spriteUrl(name: string): string {
  return `${SPRITE_PATH}${name}.png`
}
