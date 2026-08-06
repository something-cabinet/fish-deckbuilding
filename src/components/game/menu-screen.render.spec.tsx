// @vitest-environment jsdom
/**
 * MenuScreen: primary actions fire callbacks; settings panel toggles.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MenuScreen } from "@/components/game/menu-screen"
import type { GameSettings } from "@/components/game/fish-mafia-app"

const settings: GameSettings = { movementHints: true, visualEffects: true }

afterEach(cleanup)

describe("MenuScreen", () => {
  it("renders title and the two primary actions", () => {
    render(
      <MenuScreen settings={settings} onChangeSettings={() => {}} onStart={() => {}} onOpenLibrary={() => {}} />,
    )
    expect(screen.getByRole("heading", { level: 1, name: /fish mafia/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /library/i })).toBeInTheDocument()
  })

  it("Start / Library fire their callbacks", () => {
    const onStart = vi.fn()
    const onOpenLibrary = vi.fn()
    render(
      <MenuScreen settings={settings} onChangeSettings={() => {}} onStart={onStart} onOpenLibrary={onOpenLibrary} />,
    )
    act(() => fireEvent.click(screen.getByRole("button", { name: /start/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /library/i })))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onOpenLibrary).toHaveBeenCalledTimes(1)
  })

  it("Settings opens the panel and toggling a switch flips the setting", () => {
    const onChangeSettings = vi.fn()
    render(
      <MenuScreen settings={settings} onChangeSettings={onChangeSettings} onStart={() => {}} onOpenLibrary={() => {}} />,
    )
    act(() => fireEvent.click(screen.getByRole("button", { name: /settings/i })))
    expect(screen.getByText(/movement hints/i)).toBeInTheDocument()

    const hints = screen.getByRole("switch", { name: /movement hints/i })
    expect(hints).toHaveAttribute("aria-checked", "true")
    act(() => fireEvent.click(hints))
    expect(onChangeSettings).toHaveBeenCalledWith({ ...settings, movementHints: false })

    act(() => fireEvent.click(screen.getByRole("button", { name: /close settings/i })))
    expect(screen.queryByText(/movement hints/i)).not.toBeInTheDocument()
  })
})
