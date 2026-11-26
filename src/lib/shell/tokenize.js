export function tokenize(line) {
  const tokens = [];
  let current = "";
  let quote = null;
  let started = false;

  for (const char of line) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started || current) tokens.push({ type: "word", value: current });
      current = "";
      started = false;
    } else if (char === "|") {
      if (started || current) tokens.push({ type: "word", value: current });
      current = "";
      started = false;
      tokens.push({ type: "pipe" });
    } else {
      current += char;
    }
  }
  if (quote) throw new Error("unexpected EOF while looking for matching quote");
  if (started || current) tokens.push({ type: "word", value: current });
  return tokens;
}

export function splitPipeline(line) {
  const segments = [[]];
  for (const token of tokenize(line)) {
    if (token.type === "pipe") segments.push([]);
    else segments[segments.length - 1].push(token.value);
  }
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error("syntax error near unexpected token `|'");
  }
  return segments;
}
