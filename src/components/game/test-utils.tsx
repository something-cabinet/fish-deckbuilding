// Shared jsdom shims + render helper for game component tests.
import { StrictMode } from "react"
import { render } from "@testing-library/react"
import { FishMafiaGame } from "./fish-mafia-game"
import { DEFAULT_SETTINGS } from "./fish-mafia-app"

/** jsdom shims required by components that render the game (ParticleCanvas, SidePanel). */
export function installJsdomShims(): void {
  const noopCtx = new Proxy(
    {},
    { get: () => () => {}, set: () => true },
  ) as unknown as CanvasRenderingContext2D
  HTMLCanvasElement.prototype.getContext = (() => noopCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub

  Element.prototype.scrollTo = () => {}

  // jsdom does not implement elementFromPoint — the targeting/drag code
  // calls it; returning null makes drags resolve as "no drop target".
  document.elementFromPoint = () => null
}

export function renderGame() {
  installJsdomShims()
  return render(
    <StrictMode>
      <div>
        <FishMafiaGame settings={DEFAULT_SETTINGS} onExit={() => {}} />
      </div>
    </StrictMode>,
  )
}
