export function parseIp(text) {
  const parts = text.split(".");
  if (parts.length !== 4) throw new Error(`Invalid IP: ${text}`);
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) throw new Error(`Invalid IP: ${text}`);
    const octet = Number(part);
    if (octet > 255) throw new Error(`Invalid IP: ${text}`);
    value = value * 256 + octet;
  }
  return value;
}

export function formatIp(value) {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
}

export function parseCidr(text) {
  const [ip, prefixText] = text.split("/");
  if (prefixText === undefined || !/^\d{1,2}$/.test(prefixText)) {
    throw new Error(`Invalid CIDR: ${text}`);
  }
  const prefix = Number(prefixText);
  if (prefix > 32) throw new Error(`Invalid CIDR: ${text}`);
  const base = parseIp(ip);
  const size = 2 ** (32 - prefix);
  return { base, prefix, size, start: base, end: base + size - 1 };
}

export function isAligned(text) {
  const { base, size } = parseCidr(text);
  return base % size === 0;
}

export function contains(outer, inner) {
  const a = parseCidr(outer);
  const b = parseCidr(inner);
  return b.start >= a.start && b.end <= a.end;
}

export function overlaps(first, second) {
  const a = parseCidr(first);
  const b = parseCidr(second);
  return a.start <= b.end && b.start <= a.end;
}

export function toCidr(base, prefix) {
  return `${formatIp(base)}/${prefix}`;
}

// AWS reserves 5 addresses in every subnet: network, VPC router,
// DNS, future use, and broadcast.
export const AWS_RESERVED_IPS = 5;

export function usableHosts(prefix) {
  return 2 ** (32 - prefix) - AWS_RESERVED_IPS;
}

export function smallestPrefixForHosts(hosts) {
  for (let prefix = 28; prefix >= 16; prefix--) {
    if (usableHosts(prefix) >= hosts) return prefix;
  }
  throw new Error(`No supported prefix for ${hosts} hosts`);
}
