/// <reference types="codeceptjs" />
/// <reference path="../steps.d.ts" />
import { locate } from "codeceptjs"

// AC-4 / FR-4: end-to-end regression for the StrictMode command pipeline.
//
// The game is a Next.js dev app running on :3000. Each scenario boots a fresh
// game from the menu (the Before hook reloads "/"), clicks START, and waits for
// the battle screen ("Guppy the Debtor" / "Turn 1"). Scenarios exercise the
// two core gestures — move a unit, cast a card — and assert on concrete
// observable changes (aria-label position, hand size / coin).

Feature("StrictMode command regression")

Before(({ I }) => {
  I.amOnPage("/")
  I.waitForElement("button", 10) // START on the menu screen
  I.click("button")
  I.waitForElement('[role=button][aria-label*="Guppy at B3"]', 10)
  // Top-bar text is rendered uppercase (CSS text-transform), so innerText is
  // "GUPPY THE DEBTOR" / "TURN 1" — see() matches against it case-sensitively.
  I.see("GUPPY THE DEBTOR")
  I.see("TURN 1")
})

Scenario("Move a unit", async ({ I }) => {
  // Select the hero, then click the first teal reachable tile.
  await I.click('[role=button][aria-label*="Guppy at B3"]')
  await I.click(locate("[data-drop=tile][class*=bg-teal]").first())

  // The hero must leave B3 (it moves to the first reachable tile).
  await I.waitForInvisible('[role=button][aria-label*="Guppy at B3"]', 5)

  const label = await I.grabAttributeFrom('[role=button][aria-label*="Guppy"]', "aria-label")
  await I.say(`Hero position after move: ${label}`)

  if (label.includes("at B3")) {
    throw new Error(`Move failed — hero still at B3. aria-label: ${label}`)
  }
})

Scenario("Cast a card", async ({ I, battle }) => {
  // Hand is random per run; the page object casts the first affordable
  // "Launder" / "Deal" / "Draw" card and reports before/after metrics.
  const result = await battle.castFirstAffordableCard()
  await I.say(
    `Cast "${result.card}": hand ${result.handBefore} -> ${result.handAfter}, ` +
      `coin ${result.coinBefore} -> ${result.coinAfter}`,
  )

  if (result.card === "launder") {
    if (!(result.handAfter < result.handBefore)) {
      throw new Error(`Launder did not remove the card from hand: ${result.handBefore} -> ${result.handAfter}`)
    }
    if (
      result.coinBefore != null &&
      result.coinAfter != null &&
      !(result.coinAfter > result.coinBefore)
    ) {
      throw new Error(`Launder did not increase coin: ${result.coinBefore} -> ${result.coinAfter}`)
    }
  } else if (result.card === "deal") {
    if (!(result.handAfter < result.handBefore)) {
      throw new Error(`Deal did not remove the card from hand: ${result.handBefore} -> ${result.handAfter}`)
    }
  } else if (result.card === "draw") {
    if (!(result.handAfter > result.handBefore)) {
      throw new Error(`Draw did not increase the hand: ${result.handBefore} -> ${result.handAfter}`)
    }
  } else {
    await I.say("No affordable card found in either hand this run — cast assertion skipped (warning only).")
  }
})
