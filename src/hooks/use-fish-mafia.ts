"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  applyEnemyStep,
  beginPlayerTurn,
  buyCard as engineBuy,
  cardTargets,
  castCard as engineCast,
  createInitialState,
  moveUnit as engineMove,
  planEnemyTurn,
  reachableTiles,
  sellCard as engineSell,
  selectUnit,
  startEnemyPhase,
  startGame,
  unitAttack as engineUnitAttack,
} from "@/lib/game/engine"
import type { CardInstance, FxEvent, GameState, Pos } from "@/lib/game/types"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useFishMafia() {
  const [state, setState] = useState<GameState>(createInitialState)
  const [fx, setFx] = useState<FxEvent[]>([])
  const [busy, setBusy] = useState(false) // enemy turn running / animating
  const fxSeed = useRef(1)
  const started = useRef(false)

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

  /* ---- player actions ---- */

  const select = useCallback((unitId: string | null) => {
    setState((s) => selectUnit(s, unitId))
  }, [])

  const move = useCallback(
    (unitId: string, dest: Pos) => {
      setState((s) => {
        const { state: ns, fx: e } = engineMove(s, unitId, dest)
        pushFx(e)
        return ns
      })
    },
    [pushFx],
  )

  const attack = useCallback(
    (attackerId: string, targetId: string) => {
      setState((s) => {
        const { state: ns, fx: e } = engineUnitAttack(s, attackerId, targetId)
        pushFx(e)
        return ns
      })
    },
    [pushFx],
  )

  const cast = useCallback(
    (cardUid: string, target: { unitId?: string; tile?: Pos }) => {
      setState((s) => {
        const { state: ns, fx: e } = engineCast(s, cardUid, target)
        pushFx(e)
        return ns
      })
    },
    [pushFx],
  )

  const sell = useCallback((cardUid: string) => {
    setState((s) => engineSell(s, cardUid))
  }, [])

  const buy = useCallback(() => {
    setState((s) => {
      const { state: ns, fx: e } = engineBuy(s)
      pushFx(e)
      return ns
    })
  }, [pushFx])

  const restart = useCallback(() => {
    setFx([])
    setBusy(false)
    // restart happens on a user click (client-only) so shuffling is safe here
    setState(startGame())
  }, [])

  /* ---- turn flow ---- */

  const endTurn = useCallback(async () => {
    let snapshot: GameState | null = null
    setState((s) => {
      if (s.phase !== "player") return s
      snapshot = s
      return startEnemyPhase(s)
    })
    // let react commit
    await wait(0)
    if (!snapshot) return
    setBusy(true)

    const steps = planEnemyTurn(snapshot)
    // apply steps sequentially with animation delays
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
  }, [pushFx])

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
    endTurn,
    restart,
    reachable,
    targetsFor,
  }
}

export type FishMafia = ReturnType<typeof useFishMafia>
