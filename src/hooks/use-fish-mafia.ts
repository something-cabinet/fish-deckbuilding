"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  EnemyStepKind,
  Phase,
  applyEnemyStep,
  beginPlayerTurn,
  createInitialState,
  planEnemyTurn,
  reachableTiles,
  selectUnit,
  startGame,
  type FxEvent,
  type GameState,
  type Pos,
} from "@/lib/game/battle"
import {
  historyReducer,
  redoHistory,
  undoHistory,
  type HistoryBundle,
  type PlayerAction,
} from "@/lib/game/actions"
import { cardTargets, type CardInstance } from "@/lib/game/cards"
import { clone } from "@/lib/game/shared"
import { drawCards } from "@/lib/game/deck"
import { Team } from "@/lib/game/units"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const FX_TTL = 1200

/** History bundle plus the transient fx queue the UI drains (D2 + FR-8). */
interface HistoryWithFx extends HistoryBundle {
  fx: FxEvent[]
}

/**
 * Reducer-style game hook (D1/D2/D5). The whole { state, past, future, fx }
 * bundle lives in ONE useState; every updater body is a pure function of its
 * argument (no ref/class mutation inside updaters — AC-10), so React 19
 * StrictMode double-invocation is harmless by construction.
 */
export function useFishMafia(initial?: GameState) {
  const [history, setHistory] = useState<HistoryWithFx>(() => ({
    state: initial ?? createInitialState(),
    past: [],
    future: [],
    fx: [],
  }))
  const [busy, setBusy] = useState(false) // enemy turn running / animating
  const started = useRef(false)
  const fxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // C2: don't let the debounced fx purge fire after the hook unmounts
  useEffect(() => () => {
    if (fxTimer.current) clearTimeout(fxTimer.current)
  }, [])

  /** Debounced purge of the fx queue (a pure updater; timer runs outside it). */
  const scheduleFxClear = useCallback(() => {
    if (fxTimer.current) clearTimeout(fxTimer.current)
    fxTimer.current = setTimeout(() => {
      setHistory((b) => (b.fx.length ? { ...b, fx: [] } : b))
    }, FX_TTL)
  }, [])

  /** Dispatch a player action through the pure reducer + history bookkeeping. */
  const dispatch = useCallback(
    (action: PlayerAction) => {
      setHistory((b) => {
        const result = historyReducer(b, action)
        return { ...result, fx: [...b.fx, ...result.fx] }
      })
      scheduleFxClear()
    },
    [scheduleFxClear],
  )

  // Shuffle + draw the opening hand only after mount to avoid SSR/client
  // hydration mismatches (the deck order is deterministic on the server).
  // Overworld battles provide `initial` (deck from the run, empty hand), so
  // they also go through startGame here to get the opening hand.
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (history.state.hand.length > 0) return
    const { state, fx } = startGame(history.state)
    setHistory((b) => ({ ...b, state, fx: [...b.fx, ...fx] }))
    if (fx.length) scheduleFxClear()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, [])

  /* ---- player actions (plain-data actions through the reducer, FR-1) ---- */

  const select = useCallback((unitId: string | null) => {
    setHistory((b) => ({ ...b, state: selectUnit(b.state, unitId) }))
  }, [])

  const move = useCallback(
    (unitId: string, dest: Pos) => dispatch({ kind: "move", unitId, dest }),
    [dispatch],
  )

  const attack = useCallback(
    (attackerId: string, targetId: string) => dispatch({ kind: "attack", attackerId, targetId }),
    [dispatch],
  )

  const cast = useCallback(
    (cardUid: string, target: { unitId?: string; tile?: Pos }) =>
      dispatch({ kind: "playCard", cardUid, target }),
    [dispatch],
  )

  const sell = useCallback((cardUid: string) => dispatch({ kind: "sell", cardUid }), [dispatch])

  /* ---- undo / redo (D2: pure functions over the history bundle) ---- */

  const undo = useCallback(() => {
    setHistory((b) => ({ ...undoHistory(b), fx: b.fx }))
  }, [])

  const redo = useCallback(() => {
    setHistory((b) => ({ ...redoHistory(b), fx: b.fx }))
  }, [])

  const restart = useCallback(() => {
    if (fxTimer.current) clearTimeout(fxTimer.current)
    const { state, fx } = startGame()
    setHistory({ state, past: [], future: [], fx })
    setBusy(false)
    if (fx.length) scheduleFxClear()
  }, [scheduleFxClear])

  /* ---- turn flow ---- */

  const endTurn = useCallback(async () => {
    // endTurn commits history (clears past/future) and starts the enemy phase
    const { state: next, fx } = historyReducer(history, { kind: "endTurn" })
    setHistory((b) => ({ ...b, state: next, past: [], future: [], fx: [...b.fx, ...fx] }))
    // let react commit
    await wait(0)
    setBusy(true)

    // apply enemy steps sequentially with animation delays — enemy steps run
    // through the same pure shape but never enter the undo stack (D6)
    let current = next
    const steps = planEnemyTurn(current)
    for (const step of steps) {
      if (current.phase === Phase.Won || current.phase === Phase.Lost) break
      const { state: ns, fx: e } = applyEnemyStep(current, step)
      current = ns
      // B1: commit state + fx together per step so tokens animate in place and
      // hit-markers resolve against live state (FR-7/Scenario 3)
      setHistory((b) => ({ ...b, state: ns, fx: [...b.fx, ...e] }))
      scheduleFxClear()
      await wait(step.kind === EnemyStepKind.Attack ? 480 : 300)
    }

    await wait(250)
    const { state: refreshed, fx: turnFx } = beginPlayerTurn(current)
    setHistory((b) => ({ ...b, state: refreshed, fx: [...b.fx, ...turnFx] }))
    if (turnFx.length) scheduleFxClear()
    setBusy(false)
  }, [history, scheduleFxClear])

  /* ---- derived ---- */

  const debugUpdate = useCallback((partial: Partial<GameState>) => {
    setHistory((b) => ({ ...b, state: { ...b.state, ...partial } }))
  }, [])

  const debugDrawCards = useCallback(
    (n: number) => {
      setHistory((b) => {
        const c = clone(b.state)
        const fx: FxEvent[] = []
        drawCards(c, n, fx)
        return { ...b, state: c, fx: [...b.fx, ...fx] }
      })
      scheduleFxClear()
    },
    [scheduleFxClear],
  )

  const { state, fx } = history

  const reachable = useMemo(() => {
    if (!state.selectedUnitId) return [] as Pos[]
    const u = state.units.find((x) => x.id === state.selectedUnitId)
    if (!u || u.team !== Team.Player || u.hasMoved || state.phase !== Phase.Player) return []
    return reachableTiles(state, state.selectedUnitId)
  }, [state])

  const targetsFor = useCallback((card: CardInstance) => cardTargets(state, card), [state])

  return {
    state,
    fx,
    busy,
    select,
    move,
    attack,
    cast,
    sell,
    undo,
    redo,
    endTurn,
    restart,
    debugUpdate,
    debugDrawCards,
    reachable,
    targetsFor,
  }
}

export type FishMafia = ReturnType<typeof useFishMafia>
