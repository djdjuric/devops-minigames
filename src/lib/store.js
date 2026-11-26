import { applyResult, emptyProfile } from "./profile.js";

export const PROFILE_STORAGE_KEY = "devops-minigames:profile:v2";
const LEGACY_KEY = "devops-minigames:v1";
const EXPORT_VERSION = 2;

const finite = (value, fallback = 0) => Number.isFinite(value) && value >= 0 ? value : fallback;

export function normalizeProfile(value) {
  const clean = emptyProfile();
  if (!value || typeof value !== "object" || Array.isArray(value)) return clean;
  clean.xp = finite(value.xp);
  clean.streak = finite(value.streak);
  clean.lastDay = typeof value.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.lastDay) ? value.lastDay : null;
  clean.runs = finite(value.runs);
  if (value.games && typeof value.games === "object" && !Array.isArray(value.games)) {
    for (const [id, game] of Object.entries(value.games)) {
      if (!/^[a-z0-9-]{1,40}$/.test(id) || !game || typeof game !== "object") continue;
      clean.games[id] = {
        best: finite(game.best),
        bestPct: Math.min(100, finite(game.bestPct)),
        plays: finite(game.plays),
      };
    }
  }
  if (value.achievements && typeof value.achievements === "object" && !Array.isArray(value.achievements)) {
    for (const [id, day] of Object.entries(value.achievements)) {
      if (/^[a-z0-9-]{1,50}$/.test(id) && typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
        clean.achievements[id] = day;
      }
    }
  }
  return clean;
}

export function todayString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function loadProfile() {
  try {
    const raw = globalThis.localStorage?.getItem(PROFILE_STORAGE_KEY);
    if (raw) return normalizeProfile(JSON.parse(raw));
    const legacy = JSON.parse(globalThis.localStorage?.getItem(LEGACY_KEY) ?? "{}");
    const profile = emptyProfile();
    for (const [id, entry] of Object.entries(legacy)) {
      if (entry && typeof entry.best === "number") {
        profile.games[id] = { best: entry.best, bestPct: 0, plays: entry.plays ?? 1 };
      }
    }
    return profile;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile) {
  const clean = normalizeProfile(profile);
  try {
    globalThis.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // storage unavailable (private mode, quota); progress is simply not saved
  }
  return clean;
}

export function exportProfile(profile) {
  return JSON.stringify({
    app: "devops-minigames",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: normalizeProfile(profile),
  }, null, 2);
}

export function importProfile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!parsed || parsed.app !== "devops-minigames" || parsed.version !== EXPORT_VERSION || !parsed.profile) {
    throw new Error("That file is not a DevOps Minigames v2 progress export.");
  }
  return normalizeProfile(parsed.profile);
}

export function recordResult(result, totalGames) {
  const outcome = applyResult(loadProfile(), result, { today: todayString(), totalGames });
  saveProfile(outcome.profile);
  return outcome;
}
