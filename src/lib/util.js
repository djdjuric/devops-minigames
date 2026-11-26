export function shuffle(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sample(items, count, rng = Math.random) {
  return shuffle(items, rng).slice(0, count);
}

export function pick(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}
