import { test } from "node:test";
import assert from "node:assert/strict";
import { iamScenarios } from "../src/data/iam.js";
import { matcherPairs } from "../src/data/matcher.js";
import { incidents } from "../src/data/incidents.js";
import { bugSnippets } from "../src/data/bugs.js";
import { quizQuestions } from "../src/data/quiz.js";

const isDoc = (url) => typeof url === "string" && url.startsWith("https://");

test("iam scenarios are well formed", () => {
  for (const s of iamScenarios) {
    assert.ok(["Allow", "Deny"].includes(s.answer));
    assert.ok(s.policies.length > 0 && s.request.action && s.request.resource);
    assert.ok(s.explain && isDoc(s.doc));
  }
});

test("matcher terms and descriptions are unique", () => {
  assert.equal(new Set(matcherPairs.map((p) => p.term)).size, matcherPairs.length);
  assert.equal(new Set(matcherPairs.map((p) => p.desc)).size, matcherPairs.length);
  assert.ok(matcherPairs.every((p) => isDoc(p.doc)));
});

test("incident steps have exactly one good option", () => {
  for (const incident of incidents) {
    assert.ok(isDoc(incident.doc));
    for (const step of incident.steps) {
      assert.equal(step.options.filter((o) => o.good).length, 1, step.prompt);
      assert.ok(step.options.every((o) => o.why));
    }
  }
});

test("bug lines point inside the snippet at a non-empty line", () => {
  for (const b of bugSnippets) {
    assert.ok(Number.isInteger(b.bug) && b.bug >= 0 && b.bug < b.lines.length, b.title);
    assert.ok(b.lines[b.bug].trim().length > 0, b.title);
    assert.ok(b.explain && isDoc(b.doc));
  }
});

test("quiz questions have unique options and the correct one is not duplicated", () => {
  assert.ok(quizQuestions.length >= 10);
  for (const q of quizQuestions) {
    const all = [q.correct, ...q.wrong];
    assert.equal(new Set(all).size, all.length, q.q);
    assert.equal(q.wrong.length, 3, q.q);
    assert.ok(isDoc(q.doc));
  }
});
