import { parseCidr, parseIp } from "./cidr.js";

export const PROTOCOLS = ["tcp", "udp", "icmp", "all"];

const hasPorts = (protocol) => protocol === "tcp" || protocol === "udp";

export function ruleError(rule) {
  if (!PROTOCOLS.includes(rule.protocol)) return "Pick a protocol";
  if (hasPorts(rule.protocol)) {
    const from = Number(rule.from);
    const to = Number(rule.to);
    const valid = (n) => Number.isInteger(n) && n >= 0 && n <= 65535;
    if (rule.from === "" || rule.to === "" || !valid(from) || !valid(to)) return "Ports must be 0-65535";
    if (from > to) return "From port is larger than To port";
  }
  try {
    parseCidr(String(rule.source ?? "").trim());
  } catch {
    return "Source must be a CIDR such as 10.0.0.0/16 or 203.0.113.5/32";
  }
  return null;
}

function matches(rule, packet) {
  if (ruleError(rule)) return false;
  if (rule.protocol !== "all" && rule.protocol !== packet.protocol) return false;
  if (hasPorts(rule.protocol) && (packet.port < Number(rule.from) || packet.port > Number(rule.to))) return false;
  const { start, end } = parseCidr(rule.source.trim());
  const ip = parseIp(packet.src);
  return ip >= start && ip <= end;
}

// Security groups have allow rules only and deny everything else by default.
export function isAllowed(rules, packet) {
  return rules.some((rule) => matches(rule, packet));
}

export function runTraffic(rules, packets) {
  return packets.map((packet) => {
    const allowed = isAllowed(rules, packet);
    return { ...packet, allowed, correct: allowed === (packet.expect === "allow") };
  });
}

export function allCorrect(results) {
  return results.every((r) => r.correct);
}
