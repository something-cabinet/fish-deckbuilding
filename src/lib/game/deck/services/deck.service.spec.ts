import { describe, expect, it } from "vitest"
import { createInitialState } from "@/lib/game/battle"
import { drawCards, shuffle } from "@/lib/game/deck"
import { HAND_MAX } from "@/lib/game/deck"
import type { FxEvent } from "@/lib/game/battle"

function stateWithHand(count: number) {
  const s = createInitialState()
  const held = s.deck.splice(0, count)
  s.hand = held
  return s
}

describe("deck: drawCards", () => {
  it("draws cards from the deck into the hand", () => {
    const s = stateWithHand(0)
    const deckBefore = s.deck.length
    const fx: FxEvent[] = []
    drawCards(s, 2, fx)
    expect(s.hand.length).toBe(2)
    expect(s.deck.length).toBe(deckBefore - 2)
  })

  it("burns a card when the hand is full", () => {
    const s = stateWithHand(HAND_MAX)
    const deckBefore = s.deck.length
    const fx: FxEvent[] = []
    drawCards(s, 2, fx)
    expect(s.hand.length).toBe(HAND_MAX)
    expect(s.deck.length).toBe(deckBefore)
    expect(s.log.some((l) => l.text.includes("hand is full"))).toBe(true)
  })

  it("reshuffles the discard into the deck when the deck is empty", () => {
    const s = createInitialState()
    s.discard = s.deck.splice(0, 3) // three cards in discard
    s.deck = [] // deck empty
    const fx: FxEvent[] = []
    drawCards(s, 3, fx)
    expect(s.hand.length).toBe(3)
    expect(s.deck.length).toBe(0)
    expect(s.discard.length).toBe(0)
    expect(s.log.some((l) => l.text.includes("reshuffled"))).toBe(true)
  })

  it("returns without drawing when deck and discard are both empty", () => {
    const s = stateWithHand(0)
    s.deck = []
    s.discard = []
    const fx: FxEvent[] = []
    drawCards(s, 3, fx)
    expect(s.hand.length).toBe(0)
  })

  it("shuffle preserves the deck size", () => {
    const s = createInitialState()
    const shuffled = shuffle(s.deck)
    expect(shuffled.length).toBe(s.deck.length)
    expect(new Set(shuffled.map((c) => c.uid)).size).toBe(shuffled.length)
  })
})
