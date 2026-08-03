"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  clearCurrentNode,
  clearSave,
  createNewRun,
  enemiesForNode,
  generateAllZoneMaps,
  healAtRest,
  isBossNode,
  isRestNode,
  loadSave,
  reachableNodes,
  rollRewards,
  saveState,
  travelToNode,
  unlockNextZone,
  zoneName,
} from "@/lib/game/overworld-engine"
import { createInitialState } from "@/lib/game/engine"
import type { GameState } from "@/lib/game/types"
import type { MapNode, OverworldState } from "@/lib/game/overworld-types"

/**
 * Overworld state management: holds the run, derives the seeded zone maps,
 * auto-saves to localStorage on every node transition, and exposes node
 * resolution actions (rest heal, battle win -> reward -> card pick, boss win
 * -> zone unlock).
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
   * Resolve a Battle node win: roll the reward options for this node. The
   * caller shows the reward screen; on pick, `claimReward` commits it.
   */
  const startReward = useCallback(() => {
    const s = state
    if (!s) return
    setReward(rollRewards(s.seed, s.zoneIndex, s.nodeId))
  }, [state])

  /**
   * Claim a reward card + gold: add to deck, grey the battle node, save.
   * Used for normal battle nodes.
   */
  const claimReward = useCallback((cardId: string, gold: number) => {
    setState((s) => {
      if (!s) return s
      return clearCurrentNode({
        ...s,
        deck: [...s.deck, cardId],
        gold: s.gold + gold,
      })
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
   * Write hero HP back into the run after a won battle.
   */
  const updateHp = useCallback((hp: number) => {
    setState((s) => (s ? { ...s, hp: Math.max(1, Math.min(s.maxHp, hp)) } : s))
  }, [])

  /**
   * Resolve a Boss node win: unlock the next zone, grey the boss node, move
   * the hero to the next zone's start node, save.
   */
  const claimBossWin = useCallback(() => {
    setState((s) => {
      if (!s) return s
      const unlocked = unlockNextZone(s)
      const nextZone = unlocked.zoneIndex + 1
      if (nextZone < maps.length) {
        return { ...unlocked, zoneIndex: nextZone, nodeId: "0-0", visited: [] }
      }
      // final boss defeated -> run complete, keep hero where they are
      return unlocked
    })
    setReward(null)
  }, [maps.length])

  /** Loss: return to map at the current node; nothing is lost. */
  const onLoss = useCallback(() => setReward(null), [])

  const currentMap: MapNode[] = state ? maps[state.zoneIndex] ?? [] : []
  const reachable: MapNode[] = state ? reachableNodes(currentMap, state) : []

  /** Build the battle GameState for the hero's current node. */
  const buildBattleState = useCallback(
    (nodeIdOverride?: string): GameState | null => {
      const s = state
      if (!s) return null
      // stale-closure-safe: allow callers to pass the just-clicked node so
      // boss battles build the right lineup before the travel state lands.
      const eff = nodeIdOverride ? { ...s, nodeId: nodeIdOverride } : s
      return createInitialState({
        heroHp: eff.hp,
        heroMaxHp: eff.maxHp,
        deck: eff.deck,
        enemies: enemiesForNode(eff),
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
    onLoss,
    buildBattleState,
  }
}

export type Overworld = ReturnType<typeof useOverworld>
