"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  REMOVE_PRICE,
  applyEventChoice,
  buyCard as buyCardEngine,
  clearCurrentNode,
  clearSave,
  createNewRun,
  enemiesForNode,
  eventForNode,
  generateAllZoneMaps,
  healAtRest,
  isBossNode,
  isForeclosed,
  isRestNode,
  loadSave,
  nodeTypeAt,
  payDebt as payDebtEngine,
  reachableNodes,
  removeCardFromDeck,
  rollEliteRewards,
  rollRewards,
  rollTreasure,
  saveState,
  shopInventory,
  travelToNode,
  unlockNextZone,
  zoneName,
} from "@/lib/game/overworld-engine"
import { createInitialState } from "@/lib/game/battle"
import type { GameState } from "@/lib/game/battle"
import type { MapNode, NodeType, OverworldState } from "@/lib/game/overworld-types"

type RewardKind = "battle" | "elite" | "treasure"

/**
 * Overworld state management: holds the run, derives the seeded zone maps,
 * auto-saves to localStorage on every node transition, and exposes node
 * resolution actions (rest heal, battle/elite/treasure reward, shop
 * purchases, event choices, debt payment, boss win -> zone unlock).
 */
export function useOverworld() {
  const [state, setState] = useState<OverworldState | null>(() => loadSave())
  const [reward, setReward] = useState<ReturnType<typeof rollRewards> | null>(null)

  const maps = useMemo(() => (state ? generateAllZoneMaps(state.seed) : []), [state?.seed])

  // Auto-save whenever the run changes (every node transition is a state change).
  // Skipped while a reward is pending so a reload mid-pick returns to the map.
  useEffect(() => {
    if (state && !reward) saveState(state)
  }, [state, reward])

  const beginNewRun = useCallback(() => {
    clearSave()
    setState(createNewRun())
    setReward(null)
  }, [])

  const continueRun = useCallback(() => {
    setState(loadSave())
    setReward(null)
  }, [])

  const abandonRun = useCallback(() => {
    clearSave()
    setState(null)
    setReward(null)
  }, [])

  /** Click a reachable node: hero travels there (auto-save fires). */
  const travel = useCallback((nodeId: string) => {
    setState((s) => (s ? travelToNode(s, nodeId) : s))
    setReward(null)
  }, [])

  /** Resolve a Rest node: heal 30% max HP, grey the node, save. */
  const heal = useCallback(() => {
    setState((s) => (s ? healAtRest(s) : s))
  }, [])

  /**
   * Resolve a Battle / Elite / Treasure node: roll the reward options. The
   * caller shows the reward screen; on pick, `claimReward` commits it.
   */
  const startReward = useCallback(
    (kind: RewardKind = "battle") => {
      const s = state
      if (!s) return
      const roll =
        kind === "elite"
          ? rollEliteRewards
          : kind === "treasure"
            ? rollTreasure
            : rollRewards
      setReward(roll(s.seed, s.zoneIndex, s.nodeId))
    },
    [state],
  )

  /** Claim a reward card + gold: add to deck, grey the node, save. */
  const claimReward = useCallback((cardId: string, gold: number) => {
    setState((s) => {
      if (!s) return s
      return clearCurrentNode({ ...s, deck: [...s.deck, cardId], gold: s.gold + gold })
    })
    setReward(null)
  }, [])

  /**
   * Claim a boss-win reward: add card + gold, clear the boss node, and move
   * the hero to the next zone's start node (if one exists). Save.
   */
  const claimBossReward = useCallback(
    (cardId: string, gold: number) => {
      setState((s) => {
        if (!s) return s
        const withReward = clearCurrentNode({
          ...s,
          deck: [...s.deck, cardId],
          gold: s.gold + gold,
        })
        const unlocked = unlockNextZone(withReward)
        const nextZone = unlocked.zoneIndex + 1
        if (nextZone < maps.length) {
          return { ...unlocked, zoneIndex: nextZone, nodeId: "0-0", visited: [] }
        }
        return unlocked
      })
      setReward(null)
    },
    [maps.length],
  )

  /**
   * Write hero HP (and optionally the run-scoped Fin earned in battle) back
   * into the run after a won battle.
   */
  const updateHp = useCallback((hp: number, fin?: number) => {
    setState((s) =>
      s
        ? {
            ...s,
            hp: Math.max(1, Math.min(s.maxHp, hp)),
            ...(typeof fin === "number" ? { fin } : {}),
          }
        : s,
    )
  }, [])

  /** Boss node win with no reward pick (final boss): unlock / advance. */
  const claimBossWin = useCallback(() => {
    setState((s) => {
      if (!s) return s
      const unlocked = unlockNextZone(s)
      const nextZone = unlocked.zoneIndex + 1
      if (nextZone < maps.length) {
        return { ...unlocked, zoneIndex: nextZone, nodeId: "0-0", visited: [] }
      }
      return unlocked
    })
    setReward(null)
  }, [maps.length])

  /* --- shop actions --- */

  const buyCard = useCallback((cardId: string, price: number) => {
    setState((s) => (s ? buyCardEngine(s, cardId, price) : s))
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setState((s) => (s ? removeCardFromDeck(s, cardId, REMOVE_PRICE) : s))
  }, [])

  const payDebt = useCallback((amount: number) => {
    setState((s) => (s ? payDebtEngine(s, amount) : s))
  }, [])

  /** Leave a shop: grey the node (ticks interest), save. */
  const leaveShop = useCallback(() => {
    setState((s) => (s ? clearCurrentNode(s) : s))
  }, [])

  /* --- event actions --- */

  const resolveEvent = useCallback(
    (choice: { gold?: number; hp?: number; debt?: number; card?: string }) => {
      setState((s) => (s ? applyEventChoice(s, choice) : s))
    },
    [],
  )

  /** Loss: return to map at the current node; nothing is lost. */
  const onLoss = useCallback(() => setReward(null), [])

  const currentMap: MapNode[] = state ? maps[state.zoneIndex] ?? [] : []
  const reachable: MapNode[] = state ? reachableNodes(currentMap, state) : []
  const nodeType: NodeType | null = state ? nodeTypeAt(state) : null

  const shop = useMemo(
    () => (state ? shopInventory(state.seed, state.zoneIndex, state.nodeId) : []),
    [state?.seed, state?.zoneIndex, state?.nodeId],
  )
  const event = useMemo(
    () => (state ? eventForNode(state.seed, state.zoneIndex, state.nodeId) : null),
    [state?.seed, state?.zoneIndex, state?.nodeId],
  )

  /** Build the battle GameState for the hero's current node. */
  const buildBattleState = useCallback(
    (nodeIdOverride?: string): GameState | null => {
      const s = state
      if (!s) return null
      const eff = nodeIdOverride ? { ...s, nodeId: nodeIdOverride } : s
      return createInitialState({
        heroHp: eff.hp,
        heroMaxHp: eff.maxHp,
        deck: eff.deck,
        enemies: enemiesForNode(eff),
        fin: eff.fin,
      })
    },
    [state],
  )

  return {
    state,
    hasSave: state != null,
    maps,
    currentMap,
    reachable,
    reward,
    nodeType,
    shop,
    event,
    removePrice: REMOVE_PRICE,
    foreclosed: state ? isForeclosed(state) : false,
    isBossNode: state ? isBossNode(state) : false,
    isRestNode: state ? isRestNode(state) : false,
    zoneName: state ? zoneName(state.zoneIndex) : "",
    beginNewRun,
    continueRun,
    abandonRun,
    travel,
    heal,
    startReward,
    claimReward,
    claimBossReward,
    claimBossWin,
    updateHp,
    buyCard,
    removeCard,
    payDebt,
    leaveShop,
    resolveEvent,
    onLoss,
    buildBattleState,
  }
}

export type Overworld = ReturnType<typeof useOverworld>
