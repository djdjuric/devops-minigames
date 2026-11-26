import { createContainer, runDocker, normalizeImage } from "./docker.js";
import { splitPipeline } from "./tokenize.js";

const HELP = [
  "Available commands:",
  "  docker ps [-a], logs [--tail N], inspect, run, start, stop, restart, rm [-f], images, stats",
  "  ls, cat, grep [-i -v -c], head, tail, wc -l, echo, pwd, whoami, clear",
  "  hint     reveal the next hint (costs points)",
  "  answer   submit an answer on investigation levels, e.g.  answer my-host",
  "Pipes work: docker logs api | grep ERROR | tail -n 5",
].join("\n");

function readFileOrStdin(state, args, stdin) {
  const file = args.find((a) => !a.startsWith("-"));
  if (file === undefined) return stdin === null ? { error: "missing file operand" } : { text: stdin };
  if (!(file in state.files)) return { error: `${file}: No such file or directory` };
  return { text: state.files[file] };
}

function countFlag(args) {
  const index = args.findIndex((a) => a === "-n");
  if (index >= 0) return { n: Number(args[index + 1]), rest: args.filter((_, i) => i !== index && i !== index + 1) };
  const short = args.find((a) => /^-\d+$/.test(a));
  if (short) return { n: Number(short.slice(1)), rest: args.filter((a) => a !== short) };
  return { n: 10, rest: args };
}

function toRegExp(pattern, ignoreCase) {
  try {
    return new RegExp(pattern, ignoreCase ? "i" : "");
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ignoreCase ? "i" : "");
  }
}

function runBuiltin(state, name, args, stdin) {
  switch (name) {
    case "help":
      return { out: HELP };
    case "pwd":
      return { out: "/home/player" };
    case "whoami":
      return { out: "player" };
    case "echo":
      return { out: args.join(" ") };
    case "ls":
      return { out: Object.keys(state.files).sort().join("  ") };
    case "cat": {
      const file = args[0];
      if (!file) return stdin === null ? { out: "cat: missing file operand", error: true } : { out: stdin };
      if (!(file in state.files)) return { out: `cat: ${file}: No such file or directory`, error: true };
      return { out: state.files[file] };
    }
    case "grep": {
      const flags = args.filter((a) => /^-[ivcE]+$/.test(a)).join("");
      const rest = args.filter((a) => !/^-[ivcE]+$/.test(a));
      const [pattern, ...files] = rest;
      if (pattern === undefined) return { out: "Usage: grep [-i] [-v] [-c] PATTERN [FILE]", error: true };
      const source = readFileOrStdin(state, files, stdin);
      if (source.error) return { out: `grep: ${source.error}`, error: true };
      const regex = toRegExp(pattern, flags.includes("i"));
      const matched = source.text.split("\n").filter((line) => regex.test(line) !== flags.includes("v"));
      return { out: flags.includes("c") ? String(matched.length) : matched.join("\n"), noMatch: matched.length === 0 };
    }
    case "head":
    case "tail": {
      const { n, rest } = countFlag(args);
      const source = readFileOrStdin(state, rest, stdin);
      if (source.error) return { out: `${name}: ${source.error}`, error: true };
      const lines = source.text.split("\n");
      return { out: (name === "head" ? lines.slice(0, n) : lines.slice(-n || lines.length)).join("\n") };
    }
    case "wc": {
      const source = readFileOrStdin(state, args.filter((a) => a !== "-l"), stdin);
      if (source.error) return { out: `wc: ${source.error}`, error: true };
      return { out: String(source.text === "" ? 0 : source.text.split("\n").length) };
    }
    default:
      return null;
  }
}

export function createSession(scenario) {
  const state = {
    containers: [],
    images: structuredClone(scenario.images),
    files: { ...(scenario.files ?? {}) },
    counter: 1,
    answer: null,
    commands: 0,
    hintsUsed: 0,
  };
  for (const spec of scenario.containers ?? []) {
    const container = createContainer(state, { ...spec, image: normalizeImage(spec.image) });
    container.status = spec.status ?? "running";
    container.exitCode = spec.exitCode ?? 0;
    container.oomKilled = spec.oomKilled ?? false;
  }

  function exec(line) {
    const trimmed = line.trim();
    if (!trimmed) return { lines: [], solved: scenario.isSolved(state) };

    if (trimmed === "clear") return { clear: true, lines: [], solved: scenario.isSolved(state) };
    state.commands++;

    if (trimmed === "hint") {
      const hint = scenario.hints[state.hintsUsed];
      if (!hint) return { lines: [{ text: "No more hints.", error: true }], solved: scenario.isSolved(state) };
      state.hintsUsed++;
      return { lines: [{ text: `Hint ${state.hintsUsed}/${scenario.hints.length}: ${hint}` }], solved: false, hint: true };
    }

    if (trimmed.startsWith("answer")) {
      const text = trimmed.slice(6).trim();
      if (!scenario.answer) return { lines: [{ text: "This level has nothing to answer. Fix the system instead.", error: true }], solved: false };
      if (!text) return { lines: [{ text: "Usage: answer <your answer>", error: true }], solved: false };
      state.answer = text;
      const solved = scenario.isSolved(state);
      return { lines: [{ text: solved ? "Answer accepted." : "That is not it. Keep digging.", error: !solved }], solved };
    }

    let segments;
    try {
      segments = splitPipeline(trimmed);
    } catch (error) {
      return { lines: [{ text: `bash: ${error.message}`, error: true }], solved: false };
    }

    let stdin = null;
    let result = { out: "" };
    for (const [index, [name, ...args]] of segments.entries()) {
      if (index > 0 && result.error) break;
      if (name === "docker") result = runDocker(state, args);
      else result = runBuiltin(state, name, args, stdin) ?? { out: `bash: ${name}: command not found`, error: true };
      if (result.error && index < segments.length - 1) break;
      stdin = result.out;
    }

    const lines = result.out === "" ? [] : result.out.split("\n").map((text) => ({ text, error: Boolean(result.error) }));
    return { lines, solved: scenario.isSolved(state) };
  }

  return { state, exec };
}

export function levelScore(session, par) {
  const { commands, hintsUsed } = session.state;
  return Math.max(10, 100 - hintsUsed * 20 - Math.max(0, commands - hintsUsed - par) * 2);
}
