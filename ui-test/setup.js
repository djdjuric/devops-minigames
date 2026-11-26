import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/";
  window.confirm = vi.fn(() => true);
  window.scrollTo = vi.fn();
  globalThis.fetch = vi.fn(() => Promise.reject(new Error("offline in component tests")));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
