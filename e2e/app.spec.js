import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PROFILE_KEY = "devops-minigames:profile:v2";

test("mission control routes to a simulation without console errors", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome, new hire" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open the Duck assistant" })).toBeVisible();
  await page.getByRole("link", { name: /Security Group Defender/ }).click();
  await expect(page.getByRole("heading", { name: "How to play" })).toBeVisible();
  await page.getByRole("button", { name: "Start mission" }).click();
  await expect(page.getByRole("button", { name: "Send traffic" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("progress survives reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      xp: 740,
      streak: 4,
      lastDay: "2025-04-02",
      runs: 5,
      games: { shell: { best: 490, bestPct: 82, plays: 2 } },
      achievements: { "first-run": "2025-04-01" },
    }));
  }, { key: PROFILE_KEY });
  await page.reload();
  await expect(page.locator(".hud-rank-name").getByText("DevOps Engineer", { exact: true })).toBeVisible();
  await expect(page.getByText("740 XP")).toBeVisible();
  await expect(page.getByText("Best 490 pts · played 2x")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Streak 4")).toBeVisible();
});

test("Duck follows the screen and explains it offline", async ({ page }) => {
  await page.goto("/#/k8s");
  await expect(page.getByRole("status")).toContainText("Kubernetes Control Room");
  await page.getByRole("button", { name: "Explain it" }).click();
  await expect(page.getByRole("region", { name: "Chat with the Duck" })).toBeVisible();
  await expect(page.getByText(/Tune replicas, probes, resources and rollouts/).last()).toBeVisible();
});

test("Shell Lab supports a complete debugging interaction", async ({ page }) => {
  await page.goto("/#/shell");
  await page.getByRole("button", { name: "Start mission" }).click();
  const shell = page.getByLabel("Shell command");
  await shell.fill("docker logs api");
  await shell.press("Enter");
  await expect(page.getByText("Error: DATABASE_URL is not set")).toBeVisible();
  await shell.fill("docker rm api");
  await shell.press("Enter");
  await shell.fill("docker run -d --name api -p 8080:8080 -e DATABASE_URL=postgres://db.internal/app myapp:1.0");
  await shell.press("Enter");
  await expect(page.getByText(/Fixed! \+/)).toBeVisible();
});

test("current pages have no serious accessibility violations", async ({ page }) => {
  for (const route of ["/", "/#/guide", "/#/achievements", "/#/k8s", "/#/shell", "/#/sg"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    expect(serious, `${route}: ${serious.map((v) => `${v.id}: ${v.help}`).join(", ")}`).toEqual([]);
  }
});

test("mobile layout does not overflow and the Duck remains usable", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile project only");
  await page.goto("/#/k8s");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Open the Duck assistant" }).click();
  await expect(page.getByRole("region", { name: "Chat with the Duck" })).toBeInViewport();
  await expect(page.getByLabel("Your message")).toBeVisible();
});
