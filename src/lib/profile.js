import { ACHIEVEMENT_BONUS_XP, achievements } from "../data/achievements.js";

export const ranks = [
  { name: "Intern", min: 0 },
  { name: "Junior Engineer", min: 200 },
  { name: "DevOps Engineer", min: 600 },
  { name: "Senior Engineer", min: 1500 },
  { name: "Principal SRE", min: 3000 },
];

export function emptyProfile() {
  return { xp: 0, streak: 0, lastDay: null, runs: 0, games: {}, achievements: {} };
}

export function rankFor(xp) {
  let index = 0;
  ranks.forEach((rank, i) => {
    if (xp >= rank.min) index = i;
  });
  const current = ranks[index];
  const next = ranks[index + 1] ?? null;
  const progress = next ? (xp - current.min) / (next.min - current.min) : 1;
  return { index, name: current.name, next, progress, toNext: next ? next.min - xp : 0 };
}

export function starsFor(pct) {
  if (pct >= 90) return 3;
  if (pct >= 70) return 2;
  if (pct >= 40) return 1;
  return 0;
}

const dayNumber = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

export function nextStreak(profile, today) {
  if (profile.lastDay === today) return profile.streak;
  if (profile.lastDay && dayNumber(today) - dayNumber(profile.lastDay) === 1) return profile.streak + 1;
  return 1;
}

export function applyResult(profile, { gameId, score, max }, { today, totalGames }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const before = profile.games[gameId] ?? { best: 0, bestPct: 0, plays: 0 };
  const isNewBest = score > before.best;
  const perfectBonus = pct === 100 ? 25 : 0;
  const xpGained = score + perfectBonus;

  const next = {
    ...profile,
    xp: profile.xp + xpGained,
    streak: nextStreak(profile, today),
    lastDay: today,
    runs: profile.runs + 1,
    games: {
      ...profile.games,
      [gameId]: { best: Math.max(before.best, score), bestPct: Math.max(before.bestPct, pct), plays: before.plays + 1 },
    },
    achievements: { ...profile.achievements },
  };

  const context = { gameId, score, max, pct, totalGames };
  const unlocked = [];
  for (const achievement of achievements) {
    if (!next.achievements[achievement.id] && achievement.check(next, context)) {
      next.achievements[achievement.id] = today;
      unlocked.push(achievement);
    }
  }
  const bonusXp = unlocked.length * ACHIEVEMENT_BONUS_XP;
  next.xp += bonusXp;

  const rankBefore = rankFor(profile.xp);
  const rankAfter = rankFor(next.xp);
  return {
    profile: next,
    pct,
    xpGained,
    perfectBonus,
    bonusXp,
    unlocked,
    isNewBest,
    best: next.games[gameId].best,
    rankBefore,
    rankAfter,
    rankedUp: rankAfter.index > rankBefore.index,
  };
}
