"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  applyEnemyStep,
  beginPlayerTurn,
  cardTargets,
  createInitialState,
  planEnemyTurn,
  reachableTiles,
  selectUnit,
  startGame,
} from "@/lib/game/engine"
import { GameSession } from "@/lib/game/history"
import type { CardInstance, FxEvent, GameState, Pos } from "@/lib/game/types"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useFishMafia() {
  const [state, setState] = useState<GameState>(createInitialState)
  const [fx, setFx] = useState<FxEvent[]>([])
  const [busy, setBusy] = useState(false) // enemy turn running / animating
  const fxSeed = useRef(1)
  const started = useRef(false)
  // FR-9/FR-10: gestures enqueue commands; the session executes them
  // deterministically with snapshot-based undo/redo (D10).
  const sessionRef = useRef(new GameSession())

  // Shuffle + draw the opening hand only after mount to avoid SSR/client
  // hydration mismatches (the deck order is deterministic on the server).
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

  /** Drain any queued commands against the latest state (deterministic order). */
  const drain = useCallback(
    (s: GameState): GameState => {
      const { results, state: ns } = sessionRef.current.drain(s)
      for (const r of results) pushFx(r.fx)
      return ns
    },
    [pushFx],
  )

  /* ---- player actions (enqueue commands, FR-12) ---- */

  const select = useCallback((unitId: string | null) => {
    setState((s) => selectUnit(s, unitId))
  }, [])

  const move = useCallback(
    (unitId: string, dest: Pos) => {
      sessionRef.current.enqueue({ kind: "move", unitId, dest })
      setState(drain)
    },
    [drain],
  )

  const attack = useCallback(
    (attackerId: string, targetId: string) => {
      sessionRef.current.enqueue({ kind: "attack", attackerId, targetId })
      setState(drain)
    },
    [drain],
  )

  const cast = useCallback(
    (cardUid: string, target: { unitId?: string; tile?: Pos }) => {
      sessionRef.current.enqueue({ kind: "playCard", cardUid, target })
      setState(drain)
    },
    [drain],
  )

  const sell = useCallback(
    (cardUid: string) => {
      sessionRef.current.enqueue({ kind: "sell", cardUid })
      setState(drain)
    },
    [drain],
  )

  const buy = useCallback(() => {
    sessionRef.current.enqueue({ kind: "buy" })
    setState(drain)
  }, [drain])

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
    let snapshot: GameState | null = null
    sessionRef.current.enqueue({ kind: "endTurn" })
    setState((s) => {
      const ns = drain(s) // end turn executes → history commits (D10)
      snapshot = ns
      return ns
    })
    // let react commit
    await wait(0)
    if (!snapshot) return
    setBusy(true)

    const steps = planEnemyTurn(snapshot)
    // apply steps sequentially with animation delays — enemy steps run as
    // commands but never enter the undo stack (D10)
    for (const step of steps) {
      let ended = false
      await new Promise<void>((resolve) => {
        setState((s) => {
          if (s.phase === "won" || s.phase === "lost") {
            ended = true
            return s
          }
          const { state: ns, fx: e } = applyEnemyStep(s, step)
          pushFx(e)
          return ns
        })
        resolve()
      })
      if (ended) break
      await wait(step.kind === "attack" ? 480 : 300)
    }

    await wait(250)
    setState((s) => beginPlayerTurn(s))
    setBusy(false)
  }, [drain, pushFx])

  /* ---- derived ---- */

  const reachable = useMemo(() => {
    if (!state.selectedUnitId) return [] as Pos[]
    const u = state.units.find((x) => x.id === state.selectedUnitId)
    if (!u || u.team !== "player" || u.hasMoved || state.phase !== "player") return []
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
