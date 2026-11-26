import { test } from "node:test";
import assert from "node:assert/strict";
import { allCorrect, isAllowed, ruleError, runTraffic } from "../src/lib/sg.js";
import { sgLevels } from "../src/data/sgLevels.js";

test("rule validation", () => {
  assert.equal(ruleError({ protocol: "tcp", from: "80", to: "80", source: "0.0.0.0/0" }), null);
  assert.match(ruleError({ protocol: "tcp", from: "90", to: "80", source: "0.0.0.0/0" }), /larger/);
  assert.match(ruleError({ protocol: "tcp", from: "80", to: "80", source: "10.0.0.1" }), /CIDR/);
  assert.match(ruleError({ protocol: "tcp", from: "", to: "80", source: "0.0.0.0/0" }), /Ports/);
  assert.equal(ruleError({ protocol: "icmp", from: "", to: "", source: "10.0.0.0/8" }), null);
});

test("matching by protocol, port range and source", () => {
  const rules = [{ protocol: "tcp", from: "8080", to: "8090", source: "10.0.0.0/24" }];
  const p = (over) => ({ protocol: "tcp", port: 8085, src: "10.0.0.7", ...over });
  assert.ok(isAllowed(rules, p({})));
  assert.ok(!isAllowed(rules, p({ port: 8091 })));
  assert.ok(!isAllowed(rules, p({ protocol: "udp" })));
  assert.ok(!isAllowed(rules, p({ src: "10.0.1.7" })));
  assert.ok(isAllowed([{ protocol: "all", from: "", to: "", source: "0.0.0.0/0" }], p({ protocol: "icmp", port: null })));
});

test("invalid rules never allow traffic", () => {
  assert.ok(!isAllowed([{ protocol: "tcp", from: "x", to: "80", source: "0.0.0.0/0" }], { protocol: "tcp", port: 80, src: "1.1.1.1" }));
});

for (const level of sgLevels) {
  test(`level ${level.id}: broken at start, fixed by the reference rules`, () => {
    assert.equal(allCorrect(runTraffic(level.rules, level.packets)), false);
    assert.equal(allCorrect(runTraffic(level.solution, level.packets)), true);
    assert.ok(level.packets.some((x) => x.expect === "allow") && level.packets.some((x) => x.expect === "block"));
    assert.ok(level.hints.length >= 1 && level.doc.startsWith("https://"));
  });
}

test("alternative valid solution for the database level (one /22)", () => {
  const level = sgLevels.find((l) => l.id === "db");
  const rules = [{ protocol: "tcp", from: "3306", to: "3306", source: "10.0.0.0/22" }];
  assert.equal(allCorrect(runTraffic(rules, level.packets)), true);
});
