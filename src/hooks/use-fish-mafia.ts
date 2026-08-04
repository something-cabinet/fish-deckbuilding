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
import { GameSession } from "@/lib/game"
import { cardTargets, type CardInstance } from "@/lib/game/cards"
import { Team } from "@/lib/game/units"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useFishMafia(initial?: GameState) {
  const [state, setState] = useState<GameState>(initial ?? createInitialState)
  const [fx, setFx] = useState<FxEvent[]>([])
  const [busy, setBusy] = useState(false) // enemy turn running / animating
  const fxSeed = useRef(1)
  const started = useRef(false)
  // FR-9/FR-10: gestures enqueue commands; the session executes them
  // deterministically with snapshot-based undo/redo (D10).
  const sessionRef = useRef(new GameSession())
  // Latest committed state, kept outside React so command draining can run
  // synchronously without impure setState updaters (React StrictMode in dev
  // double-invokes updater functions — an updater that drains the session
  // queue would consume the command on the discarded first call and no-op).
  const stateRef = useRef<GameState>(state)
  stateRef.current = state

  // Shuffle + draw the opening hand only after mount to avoid SSR/client
  // hydration mismatches (the deck order is deterministic on the server).
  // Overworld battles provide `initial` (deck from the run, empty hand), so
  // they also go through startGame here to get the opening hand.
  useEffect(() => {
    if (started.current) return
    started.current = true
    setState((s) => (s.hand.length === 0 ? startGame(s) : s))
  }, [])

  const pushFx = useCallback((events: FxEvent[]) => {
    if (!events.length) return
    const stamped = events.map((e) => ({ ...e, id: fxSeed.current++ }))
    setFx((prev) => [...prev, ...stamped])
    const ids = stamped.map((e) => e.id)
    setTimeout(() => {
      setFx((prev) => prev.filter((e) => !ids.includes(e.id)))
    }, 1200)
  }, [])

  /** Drain any queued commands against the latest committed state (deterministic order). */
  const drain = useCallback(
    (s: GameState): GameState => {
      const { results, state: ns } = sessionRef.current.drain(s)
      for (const r of results) pushFx(r.fx)
      return ns
    },
    [pushFx],
  )

  /** Execute pending commands synchronously, then commit the result to React. */
  const commit = useCallback(() => {
    const ns = drain(stateRef.current)
    stateRef.current = ns
    setState(ns)
  }, [drain])

  /* ---- player actions (enqueue commands, FR-12) ---- */

  const select = useCallback((unitId: string | null) => {
    setState((s) => selectUnit(s, unitId))
  }, [])

  const move = useCallback(
    (unitId: string, dest: Pos) => {
      sessionRef.current.enqueue({ kind: "move", unitId, dest })
      commit()
    },
    [commit],
  )

  const attack = useCallback(
    (attackerId: string, targetId: string) => {
      sessionRef.current.enqueue({ kind: "attack", attackerId, targetId })
      commit()
    },
    [commit],
  )

  const cast = useCallback(
    (cardUid: string, target: { unitId?: string; tile?: Pos }) => {
      sessionRef.current.enqueue({ kind: "playCard", cardUid, target })
      commit()
    },
    [commit],
  )

  const sell = useCallback(
    (cardUid: string) => {
      sessionRef.current.enqueue({ kind: "sell", cardUid })
      commit()
    },
    [commit],
  )

  const buy = useCallback(() => {
    sessionRef.current.enqueue({ kind: "buy" })
    commit()
  }, [commit])

  /* ---- undo / redo (FR-10, player-phase only — D10) ---- */

  const undo = useCallback(() => {
    setState((s) => {
      const prev = sessionRef.current.undo(s)
      return prev ?? s
    })
  }, [])

  const redo = useCallback(() => {
    setState((s) => {
      const next = sessionRef.current.redo(s)
      return next ?? s
    })
  }, [])

  const restart = useCallback(() => {
    sessionRef.current = new GameSession()
    setFx([])
    setBusy(false)
    // restart happens on a user click (client-only) so shuffling is safe here
    setState(startGame())
  }, [])

  /* ---- turn flow ---- */

  const endTurn = useCallback(async () => {
    sessionRef.current.enqueue({ kind: "endTurn" })
    const snapshot = drain(stateRef.current) // end turn executes → history commits (D10)
    stateRef.current = snapshot
    setState(snapshot)
    // let react commit
    await wait(0)
    if (!snapshot) return
    setBusy(true)

    const steps = planEnemyTurn(snapshot)
    // apply steps sequentially with animation delays — enemy steps run as
    // commands but never enter the undo stack (D10)
    for (const step of steps) {
      if (stateRef.current.phase === Phase.Won || stateRef.current.phase === Phase.Lost) break
      const { state: ns, fx: e } = applyEnemyStep(stateRef.current, step)
      stateRef.current = ns
      setState(ns)
      pushFx(e)
      await wait(step.kind === EnemyStepKind.Attack ? 480 : 300)
    }

    await wait(250)
    stateRef.current = beginPlayerTurn(stateRef.current)
    setState(stateRef.current)
    setBusy(false)
  }, [drain, pushFx])

  /* ---- derived ---- */

  const reachable = useMemo(() => {
    if (!state.selectedUnitId) return [] as Pos[]
    const u = state.units.find((x) => x.id === state.selectedUnitId)
    if (!u || u.team !== Team.Player || u.hasMoved || state.phase !== Phase.Player) return []
    return reachableTiles(state, state.selectedUnitId)
  }, [state])

  const targetsFor = useCallback(
    (card: CardInstance) => cardTargets(state, card),
    [state],
  )

  return {
    state,
    fx,
    busy,
    select,
    move,
    attack,
    cast,
    sell,
    buy,
    undo,
    redo,
    endTurn,
    restart,
    reachable,
    targetsFor,
  }
}

export type FishMafia = ReturnType<typeof useFishMafia>
