import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      include: ["src/lib/game/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/components/game/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/__tests__/**",
        "src/components/game/card-icons.ts",
        "src/components/game/test-utils.tsx",
      ],
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 75,
        branches: 55,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
