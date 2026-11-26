import { test } from "node:test";
import assert from "node:assert/strict";
import { contains, isAligned, overlaps, parseCidr, smallestPrefixForHosts, usableHosts } from "../src/lib/cidr.js";
import { generateRounds } from "../src/lib/cidrRounds.js";

test("usable hosts accounts for the 5 AWS reserved addresses", () => {
  assert.equal(usableHosts(24), 251);
  assert.equal(usableHosts(28), 11);
});

test("smallest prefix for host counts", () => {
  assert.equal(smallestPrefixForHosts(251), 24);
  assert.equal(smallestPrefixForHosts(252), 23);
  assert.equal(smallestPrefixForHosts(11), 28);
  assert.equal(smallestPrefixForHosts(12), 27);
});

test("overlap, containment and alignment", () => {
  assert.ok(overlaps("10.0.1.0/24", "10.0.1.128/25"));
  assert.ok(!overlaps("10.0.1.0/24", "10.0.2.0/24"));
  assert.ok(contains("10.0.0.0/16", "10.0.9.0/24"));
  assert.ok(!contains("10.0.0.0/16", "10.1.9.0/24"));
  assert.ok(isAligned("10.0.1.0/24"));
  assert.ok(!isAligned("10.0.1.64/24"));
});

test("invalid input is rejected", () => {
  assert.throws(() => parseCidr("10.0.0.0"));
  assert.throws(() => parseCidr("10.0.0.256/24"));
  assert.throws(() => parseCidr("10.0.0.0/33"));
});

test("generated rounds always have exactly one correct, consistent answer", () => {
  for (let i = 0; i < 200; i++) {
    for (const round of generateRounds(9)) {
      assert.equal(new Set(round.options).size, round.options.length);
      assert.ok(round.options.includes(round.answer));
      if (round.kind === "fit") {
        const vpc = "10.0.0.0/16";
        const existing = [...round.question.matchAll(/10\.0\.\d+\.0\/24/g)].map((m) => m[0]).slice(0, 2);
        const valid = round.options.filter(
          (o) => isAligned(o) && contains(vpc, o) && existing.every((e) => !overlaps(e, o)),
        );
        assert.deepEqual(valid, [round.answer]);
      }
    }
  }
});
