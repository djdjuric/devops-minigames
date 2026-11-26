const KEY = "devops-minigames:v1";

function read() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(data) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota); progress is simply not saved
  }
}

export function getBest(gameId) {
  return read()[gameId]?.best ?? 0;
}

export function getPlays(gameId) {
  return read()[gameId]?.plays ?? 0;
}

export function recordScore(gameId, score) {
  const data = read();
  const entry = data[gameId] ?? { best: 0, plays: 0 };
  const isNewBest = score > entry.best;
  data[gameId] = { best: Math.max(entry.best, score), plays: entry.plays + 1 };
  write(data);
  return { best: data[gameId].best, isNewBest };
}
