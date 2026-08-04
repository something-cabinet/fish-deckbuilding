import type { FxEvent, GameState } from "../../battle/models"
import { log } from "../../shared"
import { HAND_MAX } from "../constants"

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function drawCards(state: GameState, n: number, fx: FxEvent[]) {
  for (let i = 0; i < n; i++) {
    if (state.hand.length >= HAND_MAX) {
      log(state, "Your hand is full — a card is burned.", "bad")
      continue
    }
    if (state.deck.length === 0) {
      if (state.discard.length === 0) return
      state.deck = shuffle(state.discard)
      state.discard = []
      log(state, "The ledger is reshuffled.", "neutral")
    }
    const card = state.deck.shift()
    if (card) state.hand = [...state.hand, card]
  }
}
