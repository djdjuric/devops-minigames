import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import App from "../src/App.jsx";
import { DuckProvider } from "../src/components/DuckContext.jsx";
import { PROFILE_STORAGE_KEY } from "../src/lib/store.js";

function renderApp() {
  return render(
    <DuckProvider>
      <App />
    </DuckProvider>,
  );
}

describe("mission control", () => {
  test("shows progress HUD, simulations, and persistent Duck guide", () => {
    renderApp();
    expect(screen.getByRole("link", { name: /DevOps Minigames/i })).toBeInTheDocument();
    expect(screen.getByText("Intern")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Kubernetes Control Room/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Shell Lab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open the Duck assistant/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Mission control");
  });

  test("opens a mission briefing and starts the mission", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("link", { name: /Security Group Defender/i }));
    expect(await screen.findByRole("heading", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getByText(/Edit the inbound rules/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start mission" }));
    expect(screen.getByRole("heading", { name: "Open the front door" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send traffic" })).toBeInTheDocument();
  });

  test("loads persistent XP and mission stats", () => {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        xp: 740,
        streak: 4,
        lastDay: "2025-04-02",
        runs: 5,
        games: { shell: { best: 490, bestPct: 82, plays: 2 } },
        achievements: { "first-run": "2025-04-01" },
      }),
    );
    renderApp();
    expect(screen.getByText("DevOps Engineer")).toBeInTheDocument();
    expect(screen.getByText("740 XP")).toBeInTheDocument();
    expect(screen.getByText("Streak 4")).toBeInTheDocument();
    expect(screen.getByText("Best 490 pts · played 2x")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Trophies 1/ })).toBeInTheDocument();
  });

  test("explains persistence and exposes backup controls", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("link", { name: /Trophies 0/ }));
    expect(await screen.findByRole("heading", { name: "Progress is saved" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download backup" })).toBeInTheDocument();
    expect(screen.getByText(/XP, ranks, stars, scores/)).toBeInTheDocument();
  });

  test("Duck explains the current screen when Workers AI is offline", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Explain it" }));
    expect(await screen.findByRole("region", { name: "Chat with the Duck" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Choose a mission, earn XP/)).toBeInTheDocument());
  });
});
