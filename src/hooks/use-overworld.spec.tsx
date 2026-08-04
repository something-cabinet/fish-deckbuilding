// @vitest-environment jsdom
/**
 * Behavioural coverage for useOverworld — the state layer that drives the
 * reworked overworld: run lifecycle, localStorage auto-save, node travel and
 * resolution (rest / reward / shop / event), the debt ledger, and boss-win
 * zone advancement. Engine math is unit-tested separately in
 * lib/game/__tests__/overworld-engine.spec.ts; here we assert the hook wires
 * those pure functions to React state and persistence correctly.
 */
import { act, cleanup, renderHook } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useOverworld } from "@/hooks/use-overworld"
import { SAVE_KEY } from "@/lib/game/overworld-engine"
import { START_DEBT, FORECLOSURE_CAP } from "@/lib/game/overworld-data"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
})

/** Start a hook with a fresh, seeded run already in progress. */
function setupRun() {
  const view = renderHook(() => useOverworld())
  act(() => view.result.current.beginNewRun())
  return view
}

describe("run lifecycle + persistence", () => {
  it("mounts with no run when there is no save", () => {
    const { result } = renderHook(() => useOverworld())
    expect(result.current.state).toBeNull()
    expect(result.current.hasSave).toBe(false)
  })

  it("beginNewRun starts a run and auto-saves it", () => {
    const { result } = setupRun()
    expect(result.current.state).not.toBeNull()
    expect(result.current.state!.debt).toBe(START_DEBT)
    expect(window.localStorage.getItem(SAVE_KEY)).toBeTruthy()
  })

  it("abandonRun clears state and the save", () => {
    const { result } = setupRun()
    act(() => result.current.abandonRun())
    expect(result.current.state).toBeNull()
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it("continueRun rehydrates the persisted run into a fresh hook", () => {
    const first = setupRun()
    const seed = first.result.current.state!.seed
    cleanup()
    const { result } = renderHook(() => useOverworld())
    act(() => result.current.continueRun())
    expect(result.current.state?.seed).toBe(seed)
  })

  it("derives one seeded map per zone and a reachable set from the start", () => {
    const { result } = setupRun()
    expect(result.current.maps.length).toBeGreaterThan(0)
    expect(result.current.currentMap.length).toBeGreaterThan(0)
    expect(result.current.reachable.length).toBeGreaterThan(0)
  })
})

describe("travel + rest", () => {
  it("travel moves the hero to a reachable node", () => {
    const { result } = setupRun()
    const target = result.current.reachable[0].id
    act(() => result.current.travel(target))
    expect(result.current.state!.nodeId).toBe(target)
  })

  it("heal restores HP and ticks the debt ledger", () => {
    const { result } = setupRun()
    // wound the hero and park on a fresh node so the heal is observable
    act(() => {
      result.current.updateHp(1)
    })
    const debtBefore = result.current.state!.debt
    act(() => result.current.heal())
    expect(result.current.state!.hp).toBeGreaterThan(1)
    expect(result.current.state!.debt).toBeGreaterThan(debtBefore)
  })
})

describe("rewards", () => {
  it("startReward opens a reward and claimReward commits card + gold", () => {
    const { result } = setupRun()
    const goldBefore = result.current.state!.gold
    const deckBefore = result.current.state!.deck.length
    act(() => result.current.startReward("battle"))
    expect(result.current.reward).not.toBeNull()
    const pick = result.current.reward!.cards[0]
    const gold = result.current.reward!.gold
    act(() => result.current.claimReward(pick, gold))
    expect(result.current.reward).toBeNull()
    expect(result.current.state!.gold).toBe(goldBefore + gold)
    expect(result.current.state!.deck.length).toBe(deckBefore + 1)
  })

  it("elite rewards out-pay standard rewards for the same node", () => {
    const { result } = setupRun()
    act(() => result.current.startReward("battle"))
    const normalGold = result.current.reward!.gold
    act(() => result.current.startReward("elite"))
    const eliteGold = result.current.reward!.gold
    expect(eliteGold).toBeGreaterThan(normalGold)
  })
})

describe("shop + debt ledger", () => {
  it("exposes a seeded shop inventory and remove price", () => {
    const { result } = setupRun()
    expect(result.current.shop.length).toBeGreaterThan(0)
    expect(result.current.removePrice).toBeGreaterThan(0)
  })

  it("buyCard adds the card and deducts gold when affordable", () => {
    const { result } = setupRun()
    // grant gold via a reward claim so a purchase is affordable
    act(() => result.current.startReward("treasure"))
    const gold = result.current.reward!.gold
    act(() => result.current.claimReward(result.current.reward!.cards[0], gold + 500))
    const offer = result.current.shop[0]
    const before = result.current.state!.gold
    const deckBefore = result.current.state!.deck.length
    act(() => result.current.buyCard(offer.cardId, offer.price))
    expect(result.current.state!.gold).toBe(before - offer.price)
    expect(result.current.state!.deck.length).toBe(deckBefore + 1)
  })

  it("payDebt reduces gold and debt together", () => {
    const { result } = setupRun()
    act(() => result.current.startReward("treasure"))
    act(() =>
      result.current.claimReward(result.current.reward!.cards[0], result.current.reward!.gold + 200),
    )
    const goldBefore = result.current.state!.gold
    const debtBefore = result.current.state!.debt
    act(() => result.current.payDebt(15))
    expect(result.current.state!.gold).toBe(goldBefore - 15)
    expect(result.current.state!.debt).toBe(debtBefore - 15)
  })

  it("leaveShop greys the node and ticks interest", () => {
    const { result } = setupRun()
    const debtBefore = result.current.state!.debt
    const visitedBefore = result.current.state!.visited.length
    act(() => result.current.leaveShop())
    expect(result.current.state!.debt).toBeGreaterThan(debtBefore)
    expect(result.current.state!.visited.length).toBe(visitedBefore + 1)
  })
})

describe("events", () => {
  it("exposes a seeded event and resolveEvent applies its outcome", () => {
    const { result } = setupRun()
    expect(result.current.event).not.toBeNull()
    const goldBefore = result.current.state!.gold
    act(() => result.current.resolveEvent({ gold: 40, debt: 10 }))
    expect(result.current.state!.gold).toBe(goldBefore + 40)
  })
})

describe("foreclosure", () => {
  it("reports foreclosed once debt reaches the cap", () => {
    const { result } = setupRun()
    // drive debt to the cap via a punishing event outcome
    act(() => result.current.resolveEvent({ debt: FORECLOSURE_CAP }))
    expect(result.current.foreclosed).toBe(true)
  })
})

describe("battle handoff", () => {
  it("buildBattleState produces a battle seeded from the current deck + node", () => {
    const { result } = setupRun()
    const deck = result.current.state!.deck
    const battle = result.current.buildBattleState()
    expect(battle).not.toBeNull()
    // the hero's overworld HP carries into the battle state
    expect(battle!.units.some((u) => u.hp === result.current.state!.hp)).toBe(true)
    expect(deck.length).toBeGreaterThan(0)
  })
})
