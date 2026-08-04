"use client"

import { useEffect, useState } from "react"
import type { CardDef, GameState } from "@/lib/game"
import type { MapNode } from "@/lib/game/overworld-types"
import type { EventChoice } from "@/lib/game/overworld-data"
import { CardCreateScreen } from "./card-create-screen"
import { CardLibraryScreen } from "./card-library-screen"
import { EventScreen } from "./event-screen"
import { FishMafiaGame } from "./fish-mafia-game"
import { MenuScreen } from "./menu-screen"
import { OverworldMap } from "./overworld-map"
import { RewardScreen } from "./reward-screen"
import { RunSummary } from "./run-summary"
import { SavePrompt } from "./save-prompt"
import { ShopScreen } from "./shop-screen"
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
/** an overworld node resolved on the map itself, via an overlay */
type NodeAction = "shop" | "event" | null

export function FishMafiaApp() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const [screen, setScreen] = useState<Screen>("menu")
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  // custom cards authored in the card creator, surfaced in the library
  const [customCards, setCustomCards] = useState<CardDef[]>([])
  // the battle being played right now (built from the overworld run)
  const [battle, setBattle] = useState<GameState | null>(null)
  const [battleIsBoss, setBattleIsBoss] = useState(false)
  const [battleIsElite, setBattleIsElite] = useState(false)
  const [pendingBossReward, setPendingBossReward] = useState(false)
  const [nodeAction, setNodeAction] = useState<NodeAction>(null)
  const [story, setStory] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<"won" | "lost" | null>(null)
  const [lostReason, setLostReason] = useState<"foreclosure" | "defeat">("defeat")

  const overworld = useOverworld()

  const resetRunFlags = () => {
    setBattle(null)
    setBattleIsBoss(false)
    setBattleIsElite(false)
    setPendingBossReward(false)
    setNodeAction(null)
    setStory(null)
    setRunResult(null)
    setLostReason("defeat")
  }

  const startNewRun = () => {
    overworld.beginNewRun()
    resetRunFlags()
    setScreen("overworld")
  }

  const continueRun = () => {
    overworld.continueRun()
    resetRunFlags()
    setScreen("overworld")
  }

  const backToMenu = () => {
    resetRunFlags()
    setScreen("menu")
  }

  // Foreclosure ends the run: once debt hits the cap while on the map, the
  // syndicate calls in the ledger no matter where the hero stands.
  useEffect(() => {
    if (screen === "overworld" && overworld.foreclosed && !runResult) {
      setLostReason("foreclosure")
      setRunResult("lost")
    }
  }, [screen, overworld.foreclosed, runResult])

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

    switch (node.type) {
      case "rest":
        overworld.heal()
        return
      case "shop":
        setNodeAction("shop")
        return
      case "event":
        setNodeAction("event")
        return
      case "treasure":
        // no fight — roll a generous reward pick straight away
        overworld.startReward("treasure")
        return
      case "elite":
        setBattleIsBoss(false)
        setBattleIsElite(true)
        enterBattle(node.id)
        return
      case "boss":
        setBattleIsBoss(true)
        setBattleIsElite(false)
        enterBattle(node.id)
        return
      default:
        setBattleIsBoss(false)
        setBattleIsElite(false)
        enterBattle(node.id)
    }
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
      overworld.startReward("elite")
      setScreen("overworld")
      return
    }
    setPendingBossReward(false)
    overworld.startReward(battleIsElite ? "elite" : "battle")
    setBattleIsElite(false)
    setScreen("overworld")
  }

  const handleLoss = () => {
    // Defeat on the final boss ends the run
    if (battleIsBoss && overworld.state?.zoneIndex === 2) {
      setLostReason("defeat")
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
            reachable={overworld.reachable}
            onNodeClick={handleNodeClick}
            onExit={backToMenu}
          />
        ) : (
          <SavePrompt hasSave={false} onContinue={() => {}} onNewRun={startNewRun} />
        )}

        {/* shop overlay */}
        {s && nodeAction === "shop" && !runResult && (
          <ShopScreen
            gold={s.gold}
            debt={s.debt}
            deck={s.deck}
            offers={overworld.shop}
            removePrice={overworld.removePrice}
            onBuy={overworld.buyCard}
            onRemove={overworld.removeCard}
            onPayDebt={overworld.payDebt}
            onLeave={() => {
              overworld.leaveShop()
              setNodeAction(null)
            }}
          />
        )}

        {/* event overlay */}
        {s && nodeAction === "event" && overworld.event && !runResult && (
          <EventScreen
            event={overworld.event}
            onChoose={(choice: EventChoice) => {
              overworld.resolveEvent(choice)
              setNodeAction(null)
            }}
          />
        )}

        {/* post-battle / treasure card reward */}
        {s && overworld.reward && !story && !runResult && nodeAction === null && (
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
            }}
          />
        )}

        {/* run summary (won or lost) */}
        {s && runResult && (
          <RunSummary
            outcome={runResult}
            gold={s.gold}
            deckSize={s.deck.length}
            lostReason={lostReason}
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
