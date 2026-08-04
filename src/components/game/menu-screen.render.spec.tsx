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
  it("renders title and the three primary actions", () => {
    render(
      <MenuScreen settings={settings} onChangeSettings={() => {}} onStart={() => {}} onOpenLibrary={() => {}} onOpenCreate={() => {}} />,
    )
    expect(screen.getByRole("heading", { level: 1, name: /fish mafia/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /library/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument()
  })

  it("Start / Library / Create fire their callbacks", () => {
    const onStart = vi.fn()
    const onOpenLibrary = vi.fn()
    const onOpenCreate = vi.fn()
    render(
      <MenuScreen settings={settings} onChangeSettings={() => {}} onStart={onStart} onOpenLibrary={onOpenLibrary} onOpenCreate={onOpenCreate} />,
    )
    act(() => fireEvent.click(screen.getByRole("button", { name: /start/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /library/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /create/i })))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onOpenLibrary).toHaveBeenCalledTimes(1)
    expect(onOpenCreate).toHaveBeenCalledTimes(1)
  })

  it("Settings opens the panel and toggling a switch flips the setting", () => {
    const onChangeSettings = vi.fn()
    render(
      <MenuScreen settings={settings} onChangeSettings={onChangeSettings} onStart={() => {}} onOpenLibrary={() => {}} onOpenCreate={() => {}} />,
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
