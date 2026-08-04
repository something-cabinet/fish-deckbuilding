"use client"

import { useEffect, useState } from "react"
import type { CardDef, GameState } from "@/lib/game/types"
import type { MapNode } from "@/lib/game/overworld-types"
import { CardCreateScreen } from "./card-create-screen"
import { CardLibraryScreen } from "./card-library-screen"
import { FishMafiaGame } from "./fish-mafia-game"
import { MenuScreen } from "./menu-screen"
import { OverworldMap } from "./overworld-map"
import { RewardScreen } from "./reward-screen"
import { RunSummary } from "./run-summary"
import { SavePrompt } from "./save-prompt"
import { useOverworld } from "@/hooks/use-overworld"

export interface GameSettings {
  /** show teal reachable-tile dots when a unit is selected */
  movementHints: boolean
  /** render particle bursts and floating combat numbers */
  visualEffects: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  movementHints: true,
  visualEffects: true,
}

type Screen = "menu" | "overworld" | "battle" | "library" | "create"

export function FishMafiaApp() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  const [screen, setScreen] = useState<Screen>("menu")
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  // custom cards authored in the card creator, surfaced in the library
  const [customCards, setCustomCards] = useState<CardDef[]>([])
  // the battle being played right now (built from the overworld run)
  const [battle, setBattle] = useState<GameState | null>(null)
  const [battleIsBoss, setBattleIsBoss] = useState(false)
  const [pendingBossReward, setPendingBossReward] = useState(false)
  const [story, setStory] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<"won" | "lost" | null>(null)

  const overworld = useOverworld()

  const startNewRun = () => {
    overworld.beginNewRun()
    setBattle(null)
    setBattleIsBoss(false)
    setPendingBossReward(false)
    setStory(null)
    setRunResult(null)
    setScreen("overworld")
  }

  const continueRun = () => {
    overworld.continueRun()
    setBattle(null)
    setBattleIsBoss(false)
    setPendingBossReward(false)
    setStory(null)
    setRunResult(null)
    setScreen("overworld")
  }

  const backToMenu = () => {
    setBattle(null)
    setBattleIsBoss(false)
    setPendingBossReward(false)
    setStory(null)
    setRunResult(null)
    setScreen("menu")
  }

  const enterBattle = (nodeId?: string) => {
    const initial = overworld.buildBattleState(nodeId)
    if (!initial) return
    setBattle(initial)
    setRunResult(null)
    setScreen("battle")
  }

  const handleNodeClick = (node: MapNode) => {
    // move the hero to the clicked node first (auto-saves)
    overworld.travel(node.id)
    // Rest nodes resolve immediately on the map
    if (node.type === "rest") {
      overworld.heal()
      return
    }
    // Battle / Boss: start combat at the traveled node
    setBattleIsBoss(node.type === "boss")
    enterBattle(node.id)
  }

  const handleWin = (heroHp: number) => {
    overworld.updateHp(heroHp)
    if (battleIsBoss) {
      // final zone boss -> run over, show the victory summary
      if (overworld.state?.zoneIndex === 2) {
        overworld.claimBossWin()
        setRunResult("won")
        setScreen("overworld")
        return
      }
      // roll rewards on the boss node; pick claims card + gold + unlock
      setPendingBossReward(true)
      setStory("The waters part. A new depth beckons...")
      overworld.startReward()
      setScreen("overworld")
      return
    }
    setPendingBossReward(false)
    overworld.startReward()
    setScreen("overworld")
  }

  const handleLoss = (heroHp: number) => {
    // Defeat on the final boss ends the run
    if (battleIsBoss && overworld.state?.zoneIndex === 2) {
      setRunResult("lost")
      setScreen("overworld")
      return
    }
    // otherwise return to map at the same node, nothing lost
    overworld.onLoss()
    setScreen("overworld")
  }

  if (screen === "menu") {
    return (
      <MenuScreen
        settings={settings}
        onChangeSettings={setSettings}
        onStart={startNewRun}
        onContinue={hydrated && overworld.hasSave ? continueRun : undefined}
        onOpenLibrary={() => setScreen("library")}
        onOpenCreate={() => setScreen("create")}
      />
    )
  }

  if (screen === "library") {
    return (
      <CardLibraryScreen
        customCards={customCards}
        onBack={() => setScreen("menu")}
        onCreate={() => setScreen("create")}
      />
    )
  }

  if (screen === "create") {
    return (
      <CardCreateScreen
        onBack={() => setScreen("library")}
        onSave={(def) => {
          setCustomCards((prev) => [...prev, def])
          setScreen("library")
        }}
      />
    )
  }

  if (screen === "overworld") {
    const s = overworld.state
    return (
      <div className="relative h-dvh w-full">
        {s ? (
          <OverworldMap
            state={s}
            map={overworld.currentMap}
            maps={overworld.maps}
            reachable={overworld.reachable}
            activeZone={s.zoneIndex}
            onZoneSelect={() => {}}
            onNodeClick={handleNodeClick}
            onExit={backToMenu}
          />
        ) : (
          // no run yet — surface the menu-level prompt
          <SavePrompt hasSave={false} onContinue={() => {}} onNewRun={startNewRun} />
        )}

        {/* post-battle card reward */}
        {s && overworld.reward && !story && !runResult && (
          <RewardScreen
            cardIds={overworld.reward.cards}
            gold={overworld.reward.gold}
            onPick={(cardId) => {
              if (pendingBossReward) {
                overworld.claimBossReward(cardId, overworld.reward!.gold)
                setPendingBossReward(false)
              } else {
                overworld.claimReward(cardId, overworld.reward!.gold)
              }
            }}
          />
        )}

        {/* boss-win story beat */}
        {s && story && !runResult && (
          <StoryBeat
            text={story}
            onDismiss={() => {
              setStory(null)
              // if a reward was rolled before the story, it shows next frame
            }}
          />
        )}

        {/* run summary (won or lost on the depths boss) */}
        {s && runResult && (
          <RunSummary
            outcome={runResult}
            gold={s.gold}
            deckSize={s.deck.length}
            onNewRun={startNewRun}
          />
        )}
      </div>
    )
  }

  // screen === "battle"
  return (
    <FishMafiaGame
      key={`battle-${overworld.state?.nodeId ?? "r"}`}
      settings={settings}
      initial={battle ?? undefined}
      onWin={handleWin}
      onLose={handleLoss}
      onExit={backToMenu}
    />
  )
}

function StoryBeat({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ocean-deep/85 p-6 backdrop-blur-sm animate-fm-fade-in">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-gold/30 bg-card/90 px-10 py-8 text-center shadow-2xl">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-gold">The Deep Opens</p>
        <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-foreground">
          New Waters
        </h2>
        <p className="text-sm text-muted-foreground">{text}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 rounded-lg bg-gold px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-ocean-deep transition-transform hover:scale-105"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
