/// <reference types="codeceptjs" />
/// <reference path="../steps.d.ts" />
import { inject, locate } from "codeceptjs"

// Battle-screen page object (see src/components/game/fish-mafia-game.tsx).
//
// CodeceptJS v4 is ESM-first: support objects in `include` must expose a
// default export. `inject("I")` returns the typed actor; it is resolved lazily
// per call so the object can be loaded before the actor is fully initialized.

const actor = () => inject("I")

/** Selector for the hero token ("Guppy at B3" on turn 1). */
const HERO = '[role=button][aria-label*="Guppy at B3"]'
/** Any hero token (regardless of current cell). */
const HERO_ANY = '[role=button][aria-label*="Guppy"]'
/** Reachable tiles are teal-highlighted (board.tsx: bg-teal/15). */
const REACHABLE_TILE = "[data-drop=tile][class*=bg-teal]"
/** Cards in the player's hand. */
const HAND_CARD = "[data-card-uid]"
/** Enemy tokens use data-unit-id="enemy_N" (unit-token.tsx). */
const ENEMY_TOKEN = '[role=button][data-unit-id^="enemy"]'
/** The turn-1 Thug at G2 (spawn (6,1)). */
const THUG_G2 = '[role=button][aria-label*="Thug at G2"]'

export interface CastResult {
  /** Which kind of card was cast; "none" when no affordable card was found. */
  card: "launder" | "deal" | "draw" | "none"
  handBefore: number
  handAfter: number
  coinBefore: number | null
  coinAfter: number | null
}

export default {
  /** Select the hero unit by clicking its token. */
  async selectHero() {
    await actor().click(HERO)
  },

  /** Move the selected unit to the first teal-highlighted reachable tile. */
  async moveToReachableTile() {
    await actor().click(locate(REACHABLE_TILE).first())
  },

  /** Current aria-label of the hero token (e.g. "Guppy at B1, 14 of 14 health"). */
  async heroLabel(): Promise<string> {
    return actor().grabAttributeFrom(HERO_ANY, "aria-label")
  },

  /** Number of cards currently visible in the hand. */
  async handSize(): Promise<number> {
    return actor().grabNumberOfVisibleElements(HAND_CARD)
  },

  /** Coin value shown in the top bar ("Coin <n>" — the only <header> on the battle screen). */
  async coinValue(): Promise<number | null> {
    const header = await actor().grabTextFrom("header")
    const m = header.match(/Coin(\d+)/)
    return m ? Number(m[1]) : null
  },

  /**
   * Cast the first affordable card in the hand.
   *
   * Turn 1 mana is 1, so only cost-1 cards are playable: Cash Flow
   * ("Launder" — self-target, single click casts), Demand Letter ("Deal" —
   * click to arm, then click an enemy) and Market Rate ("Draw" — self-target).
   * The opening hand is a random 5 of 17, so if none of those three is present
   * we end the turn once (mana becomes 2) and search again. Returns the
   * observed before/after hand and coin values for assertion by the caller.
   */
  async castFirstAffordableCard(): Promise<CastResult> {
    const handBefore = await this.handSize()
    const coinBefore = await this.coinValue()

    const kind = await this.findAndCast()

    let handAfter = handBefore
    if (kind !== "none") {
      // Wait for the hand to reflect the cast (draws +2, everything else -1).
      const expected = kind === "draw" ? handBefore + 2 : handBefore - 1
      await actor().waitNumberOfVisibleElements(HAND_CARD, expected, 10)
      handAfter = await this.handSize()
    }

    const coinAfter = await this.coinValue()
    return { card: kind, handBefore, handAfter, coinBefore, coinAfter }
  },

  /**
   * Find a playable "Launder" / "Deal" / "Draw" card and cast it.
   * Returns the kind cast, or "none" if nothing affordable was found.
   */
  async findAndCast(): Promise<CastResult["card"]> {
    const first = await this.tryCastFromHand()
    if (first) return first

    // Rare fallback: no cost-1 card in the opening hand — take a second turn.
    actor().say("No cost-1 card in the opening hand; ending turn to search again")
    await actor().click("End Turn")
    await actor().waitForText("The Mob Moves", 10)
    await actor().waitForText("Your Move", 10)
    await actor().waitForElement(HAND_CARD, 10)

    const second = await this.tryCastFromHand()
    return second ?? "none"
  },

  /** Grab hand card texts + playability (via class) and cast the best match. */
  async tryCastFromHand(): Promise<CastResult["card"] | null> {
    const texts = await actor().grabTextFromAll(HAND_CARD)
    const classes = await actor().grabAttributeFromAll(HAND_CARD, "class")

    // Cost > mana renders cards with "cursor-not-allowed" (card.tsx) — skip them.
    const playable = (i: number) => !(classes[i] ?? "").includes("cursor-not-allowed")

    const pick = (needle: string): number | null => {
      for (let i = 0; i < texts.length; i++) {
        if (playable(i) && texts[i].includes(needle)) return i
      }
      return null
    }

    const launder = pick("Launder")
    if (launder != null) {
      actor().say(`Casting self-target card: ${texts[launder].slice(0, 60)}`)
      await actor().click(locate(HAND_CARD).at(launder + 1))
      return "launder"
    }

    const deal = pick("Deal")
    if (deal != null) {
      actor().say(`Casting targeted card: ${texts[deal].slice(0, 60)}`)
      // Click to arm, then click an enemy target.
      await actor().click(locate(HAND_CARD).at(deal + 1))
      try {
        await actor().click(locate(THUG_G2).first())
      } catch {
        // Enemy may have moved from G2 on the fallback turn — any enemy works.
        await actor().click(locate(ENEMY_TOKEN).first())
      }
      return "deal"
    }

    const draw = pick("Draw")
    if (draw != null) {
      actor().say(`Casting self-target card: ${texts[draw].slice(0, 60)}`)
      await actor().click(locate(HAND_CARD).at(draw + 1))
      return "draw"
    }

    return null
  },
}
