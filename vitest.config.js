import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./ui-test/setup.js"],
    include: ["ui-test/**/*.test.{js,jsx}"],
    restoreMocks: true,
    clearMocks: true,
  },
});
