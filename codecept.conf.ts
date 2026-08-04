/// <reference types="codeceptjs" />
import { setHeadlessWhen } from "@codeceptjs/configure"

// Run headed by default; `HEADLESS=true` (or CI) flips to headless.
setHeadlessWhen(process.env.HEADLESS)

export const config: CodeceptJS.MainConfig = {
  name: "fish-mafia-e2e",
  tests: "./e2e/**/*.journey.ts",
  output: "./e2e/output",
  require: ["ts-node/esm"],
  helpers: {
    Playwright: {
      url: "http://localhost:3000",
      browser: "chromium",
      show: !process.env.HEADLESS,
      windowSize: "1280x720",
    },
  },
  include: {
    I: "./e2e/steps_file.ts",
    battle: "./e2e/pages/battle.page.ts",
  },
  plugins: {
    retryFailedStep: { enabled: true },
    screenshotOnFail: { enabled: true },
  },
}
