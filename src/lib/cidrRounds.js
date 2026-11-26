import { AWS_RESERVED_IPS, smallestPrefixForHosts, usableHosts } from "./cidr.js";
import { pick, sample, shuffle } from "./util.js";

const DOC = "https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html";
const HOST_TARGETS = [10, 25, 60, 100, 200, 500, 1000];
const PREFIXES = [22, 24, 26, 27, 28];

function hostsRound(rng) {
  const hosts = pick(HOST_TARGETS, rng);
  const answer = smallestPrefixForHosts(hosts);
  const candidates = [answer - 1, answer, answer + 1, answer + 2].filter((p) => p >= 16 && p <= 28);
  return {
    kind: "hosts",
    question: `You need a subnet for ${hosts} hosts. What is the smallest CIDR prefix that fits, after AWS reserves ${AWS_RESERVED_IPS} addresses?`,
    options: shuffle(
      candidates.map((p) => `/${p}`),
      rng,
    ),
    answer: `/${answer}`,
    explain: `A /${answer} has ${2 ** (32 - answer)} addresses and ${usableHosts(answer)} are usable. A /${answer + 1} would have only ${usableHosts(answer + 1)}.`,
    doc: DOC,
  };
}

function usableRound(rng) {
  const prefix = pick(PREFIXES, rng);
  const total = 2 ** (32 - prefix);
  const answer = usableHosts(prefix);
  const options = [...new Set([answer, total, total - 2, total - 1])];
  return {
    kind: "usable",
    question: `How many usable IP addresses does a /${prefix} subnet have in AWS?`,
    options: shuffle(options.map(String), rng),
    answer: String(answer),
    explain: `A /${prefix} has ${total} addresses. AWS reserves 5 (network, VPC router, DNS, future use, broadcast), leaving ${answer}.`,
    doc: DOC,
  };
}

function fitRound(rng) {
  const [a, b] = sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2, rng);
  const free = pick([10, 11, 12, 13, 14, 15, 16], rng);
  const valid = `10.0.${free}.0/24`;
  const overlapping = `10.0.${a}.128/25`;
  const outside = `10.1.${free}.0/24`;
  const misaligned = `10.0.${free}.64/24`;
  return {
    kind: "fit",
    question: `The VPC is 10.0.0.0/16 and already has 10.0.${a}.0/24 and 10.0.${b}.0/24. Which new subnet CIDR is valid?`,
    options: shuffle([valid, overlapping, outside, misaligned], rng),
    answer: valid,
    explain: `${overlapping} overlaps 10.0.${a}.0/24. ${outside} is outside the VPC range. ${misaligned} has host bits set, so it is not a valid network address for a /24.`,
    doc: "https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html",
  };
}

const generators = [hostsRound, usableRound, fitRound];

export function generateRounds(count = 10, rng = Math.random) {
  return Array.from({ length: count }, (_, i) => generators[i % generators.length](rng));
}
