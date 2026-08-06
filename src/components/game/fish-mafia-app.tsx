"use client"

import { useEffect, useState } from "react"
import { CARD_LIBRARY } from "@/lib/game"
import type { CardDef, GameState } from "@/lib/game"
import { STAGE_LIBRARY, type StageDef } from "@/lib/game/stages"
import type { EnemyDef } from "@/lib/game/units"
import type { ZoneId } from "@/lib/game/overworld-types"
import type { MapNode } from "@/lib/game/overworld-types"
import type { EventChoice } from "@/lib/game/overworld-data"
import { ENEMY_LIBRARY } from "@/lib/game/units"
import { CardCreateScreen } from "./card-create-screen"
import { CardLibraryScreen, type SubTab } from "./card-library-screen"
import { EnemyCreateScreen } from "./enemy-create-screen"
import { EventScreen } from "./event-screen"
import { FishMafiaGame } from "./fish-mafia-game"
import { MenuScreen } from "./menu-screen"
import { StageCreateScreen } from "./stage-create-screen"
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

type Screen =
  | "menu"
  | "overworld"
  | "battle"
  | "library"
  | "create"
  | "create-enemy"
  | "create-stage"
/** an overworld node resolved on the map itself, via an overlay */
type NodeAction = "shop" | "event" | null

/** the design-tool screens, which are safe to restore after a reload */
type DesignScreen = Extract<Screen, "library" | "create" | "create-enemy" | "create-stage">

const DESIGN_SCREENS: DesignScreen[] = ["library", "create", "create-enemy", "create-stage"]

function isDesignScreen(s: Screen): s is DesignScreen {
  return (DESIGN_SCREENS as Screen[]).includes(s)
}

const DESIGN_LOCATION_KEY = "fm.design.location"

/**
 * Where the user was inside the design tool.
 *
 * Saving or deleting rewrites the card/enemy JSON databases, and those files
 * are imported by the game modules outside the React tree — so the dev server's
 * Fast Refresh does a full page reload, which would otherwise drop the user
 * back on the main menu mid-edit. We stash the location and restore it on mount.
 * Only design screens are restored: a run's battle and overworld state live in
 * memory and cannot be rebuilt from an id.
 */
interface DesignLocation {
  screen: DesignScreen
  subtab: SubTab
  cardId?: string
  enemyId?: string
  stageId?: string
  stageZone?: ZoneId
}

export function FishMafiaApp() {
  const [hydrated, setHydrated] = useState(false)
  const [screen, setScreen] = useState<Screen>("menu")
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  // cards from the database, managed in-app for the editor
  const [cards, setCards] = useState<CardDef[]>(() => Object.values(CARD_LIBRARY))
  // ids authored this session, badged as Custom in the library
  const [customIds, setCustomIds] = useState<string[]>([])
  const [editingCard, setEditingCard] = useState<CardDef | null>(null)
  // enemies from the database, manage in-app for the designer
  const [enemies, setEnemies] = useState<EnemyDef[]>(() => ENEMY_LIBRARY)
  const [editingEnemy, setEditingEnemy] = useState<EnemyDef | null>(null)
  // authored battle layouts, drawn from when a battle node is entered
  const [stages, setStages] = useState<StageDef[]>(() => STAGE_LIBRARY)
  const [editingStage, setEditingStage] = useState<StageDef | null>(null)
  /** zone a brand-new stage belongs to, from the section its button was in */
  const [newStageZone, setNewStageZone] = useState<ZoneId>("shallows")
  // the library tab to return to after an editor round-trip
  const [librarySubtab, setLibrarySubtab] = useState<SubTab>("cards")

  // restore the design-tool location a Fast Refresh reload would have discarded
  useEffect(() => {
    setHydrated(true)

    const raw = sessionStorage.getItem(DESIGN_LOCATION_KEY)
    if (!raw) return
    let loc: DesignLocation
    try {
      loc = JSON.parse(raw) as DesignLocation
    } catch {
      sessionStorage.removeItem(DESIGN_LOCATION_KEY)
      return
    }
    if (!isDesignScreen(loc.screen)) return

    // look the records up in the freshly re-imported databases so the editor
    // reopens on what was just written, not a stale pre-save copy
    if (loc.cardId) {
      const card = CARD_LIBRARY[loc.cardId]
      if (card) setEditingCard(card)
    }
    if (loc.enemyId) {
      const enemy = ENEMY_LIBRARY.find((e) => e.id === loc.enemyId)
      if (enemy) setEditingEnemy(enemy)
    }
    if (loc.stageId) {
      const stage = STAGE_LIBRARY.find((s) => s.id === loc.stageId)
      if (stage) setEditingStage(stage)
    }
    if (loc.stageZone) setNewStageZone(loc.stageZone)
    setLibrarySubtab(loc.subtab)
    setScreen(loc.screen)
  }, [])

  // keep that location current while the design tool is open
  useEffect(() => {
    if (!isDesignScreen(screen)) {
      sessionStorage.removeItem(DESIGN_LOCATION_KEY)
      return
    }
    const loc: DesignLocation = {
      screen,
      subtab: librarySubtab,
      cardId: editingCard?.id,
      enemyId: editingEnemy?.id,
      stageId: editingStage?.id,
      stageZone: newStageZone,
    }
    sessionStorage.setItem(DESIGN_LOCATION_KEY, JSON.stringify(loc))
  }, [screen, librarySubtab, editingCard, editingEnemy, editingStage, newStageZone])
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

  const handleWin = (heroHp: number, fin: number) => {
    overworld.updateHp(heroHp, fin)
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
      />
    )
  }

  if (screen === "library") {
    return (
      <CardLibraryScreen
        cards={cards}
        customIds={customIds}
        enemies={enemies}
        initialSubtab={librarySubtab}
        onSubtabChange={setLibrarySubtab}
        onBack={() => setScreen("menu")}
        onCreate={() => setScreen("create")}
        onEdit={(card) => {
          setEditingCard(card)
          setScreen("create")
        }}
        onDelete={(id) => {
          setCards((prev) => prev.filter((c) => c.id !== id))
          setCustomIds((prev) => prev.filter((c) => c !== id))
          fetch(`/api/cards?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          }).catch(() => {})
        }}
        onEnemyCreate={() => setScreen("create-enemy")}
        onEnemyEdit={(enemy) => {
          setEditingEnemy(enemy)
          setScreen("create-enemy")
        }}
        onEnemyDelete={(id) => {
          setEnemies((prev) => prev.filter((e) => e.id !== id))
          fetch(`/api/enemies?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          }).catch(() => {})
        }}
        stages={stages}
        onStageCreate={(zone) => {
          setNewStageZone(zone)
          setScreen("create-stage")
        }}
        onStageEdit={(stage) => {
          setEditingStage(stage)
          setScreen("create-stage")
        }}
        onStageDelete={(id) => {
          setStages((prev) => prev.filter((s) => s.id !== id))
          fetch(`/api/stages?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          }).catch(() => {})
        }}
      />
    )
  }

  if (screen === "create") {
    return (
      <CardCreateScreen
        editCard={editingCard ?? undefined}
        onBack={() => {
          setEditingCard(null)
          setScreen("library")
        }}
        onSave={(def) => {
          setCards((prev) => [...prev, def])
          setCustomIds((prev) => [...prev, def.id])
          fetch("/api/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          }).catch(() => {})
        }}
        onUpdate={(def) => {
          setCards((prev) => prev.map((c) => (c.id === def.id ? def : c)))
          fetch("/api/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          }).catch(() => {})
          setEditingCard(null)
        }}
      />
    )
  }

  if (screen === "create-enemy") {
    return (
      <EnemyCreateScreen
        editEnemy={editingEnemy ?? undefined}
        onBack={() => {
          setEditingEnemy(null)
          setScreen("library")
        }}
        onSave={(def) => {
          setEnemies((prev) => [...prev, def])
          fetch("/api/enemies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          }).catch(() => {})
        }}
        onUpdate={(def) => {
          setEnemies((prev) => prev.map((e) => (e.id === def.id ? def : e)))
          fetch("/api/enemies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          }).catch(() => {})
          setEditingEnemy(def)
        }}
      />
    )
  }

  if (screen === "create-stage") {
    return (
      <StageCreateScreen
        enemies={enemies}
        editStage={editingStage ?? undefined}
        initialZone={newStageZone}
        onBack={() => {
          setEditingStage(null)
          setScreen("library")
        }}
        onSave={(def) => {
          setStages((prev) => [...prev, def])
          fetch("/api/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          }).catch(() => {})
        }}
        onUpdate={(def) => {
          setStages((prev) => prev.map((s) => (s.id === def.id ? def : s)))
          fetch("/api/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          }).catch(() => {})
          setEditingStage(def)
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
