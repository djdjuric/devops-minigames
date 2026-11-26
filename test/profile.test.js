import { test } from "node:test";
import assert from "node:assert/strict";
import { applyResult, emptyProfile, nextStreak, rankFor, starsFor } from "../src/lib/profile.js";
import { achievements } from "../src/data/achievements.js";

const opts = (today) => ({ today, totalGames: 3 });

test("ranks and progress", () => {
  assert.equal(rankFor(0).name, "Intern");
  assert.equal(rankFor(200).name, "Junior Engineer");
  assert.equal(rankFor(100).progress, 0.5);
  assert.equal(rankFor(100).toNext, 100);
  assert.equal(rankFor(5000).next, null);
});

test("stars thresholds", () => {
  assert.deepEqual([0, 40, 70, 90, 100].map(starsFor), [0, 1, 2, 3, 3]);
});

test("streak: same day keeps, next day adds, gap resets", () => {
  const p = { ...emptyProfile(), streak: 4, lastDay: "2025-03-31" };
  assert.equal(nextStreak(p, "2025-03-31"), 4);
  assert.equal(nextStreak(p, "2025-04-01"), 5);
  assert.equal(nextStreak(p, "2025-04-03"), 1);
  assert.equal(nextStreak(emptyProfile(), "2025-04-03"), 1);
});

test("first run awards xp, best, and the first-run achievement with bonus", () => {
  const r = applyResult(emptyProfile(), { gameId: "iam", score: 50, max: 100 }, opts("2025-01-01"));
  assert.equal(r.xpGained, 50);
  assert.equal(r.isNewBest, true);
  assert.deepEqual(r.unlocked.map((a) => a.id), ["first-run"]);
  assert.equal(r.profile.xp, 100);
  assert.equal(r.profile.games.iam.bestPct, 50);
});

test("perfect run gives bonus xp and perfect achievements", () => {
  const r = applyResult(emptyProfile(), { gameId: "iam", score: 100, max: 100 }, opts("2025-01-01"));
  assert.equal(r.perfectBonus, 25);
  const ids = r.unlocked.map((a) => a.id);
  assert.ok(ids.includes("perfect") && ids.includes("least-privilege"));
});

test("achievements unlock once only and do not mutate the input", () => {
  const start = emptyProfile();
  const first = applyResult(start, { gameId: "iam", score: 10, max: 100 }, opts("2025-01-01"));
  assert.deepEqual(start, emptyProfile());
  const second = applyResult(first.profile, { gameId: "iam", score: 10, max: 100 }, opts("2025-01-01"));
  assert.equal(second.unlocked.length, 0);
  assert.equal(second.isNewBest, false);
});

test("playing every game unlocks full stack, rank up is reported", () => {
  let profile = emptyProfile();
  let rankedUp = false;
  for (const id of ["a", "b", "c"]) {
    const r = applyResult(profile, { gameId: id, score: 90, max: 100 }, opts("2025-01-01"));
    rankedUp = rankedUp || r.rankedUp;
    profile = r.profile;
  }
  assert.ok(profile.achievements["full-stack"]);
  assert.ok(profile.achievements["triple"]);
  assert.equal(rankedUp, true);
});

test("achievement ids are unique", () => {
  assert.equal(new Set(achievements.map((a) => a.id)).size, achievements.length);
});

import { exportProfile, importProfile, normalizeProfile } from "../src/lib/store.js";

test("profile export and import round-trip", () => {
  const profile = { ...emptyProfile(), xp: 420, runs: 3, games: { shell: { best: 80, bestPct: 80, plays: 2 } } };
  const restored = importProfile(exportProfile(profile));
  assert.deepEqual(restored, profile);
});

test("profile normalization rejects malformed and unsafe fields", () => {
  const clean = normalizeProfile({
    xp: -5,
    streak: "many",
    lastDay: "tomorrow",
    games: { shell: { best: 8, bestPct: 999, plays: 2 }, "bad key!": { best: 9 } },
    achievements: { perfect: "2025-04-01", "bad key!": "2025-04-01", other: "soon" },
  });
  assert.equal(clean.xp, 0);
  assert.equal(clean.lastDay, null);
  assert.equal(clean.games.shell.bestPct, 100);
  assert.equal(clean.games["bad key!"], undefined);
  assert.deepEqual(clean.achievements, { perfect: "2025-04-01" });
});

test("import rejects unrelated JSON", () => {
  assert.throws(() => importProfile("not json"), /not valid JSON/);
  assert.throws(() => importProfile('{"app":"other"}'), /not a DevOps Minigames/);
});
