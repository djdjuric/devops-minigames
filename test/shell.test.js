import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, levelScore } from "../src/lib/shell/session.js";
import { tokenize, splitPipeline } from "../src/lib/shell/tokenize.js";
import { shellLevels } from "../src/data/shellLevels.js";

const text = (result) => result.lines.map((l) => l.text).join("\n");

test("tokenizer handles quotes and pipes", () => {
  assert.deepEqual(
    tokenize(`echo "a b" 'c|d' | wc -l`).map((t) => t.value ?? "|"),
    ["echo", "a b", "c|d", "|", "wc", "-l"],
  );
  assert.deepEqual(splitPipeline("a b | c"), [["a", "b"], ["c"]]);
  assert.throws(() => splitPipeline("a | "));
  assert.throws(() => tokenize('echo "oops'));
});

for (const level of shellLevels) {
  test(`level ${level.id}: unsolved at start, solved by the reference solution`, () => {
    const session = createSession(level);
    assert.equal(level.isSolved(session.state), false);
    let last;
    for (const command of level.solution) {
      last = session.exec(command);
      assert.ok(!last.lines.some((l) => l.error), `${command} -> ${text(last)}`);
    }
    assert.equal(last.solved, true);
    assert.ok(levelScore(session, level.par) >= 10);
    assert.equal(level.hints.length, 3);
    assert.ok(level.doc.startsWith("https://"));
  });
}

test("the original deploy commands fail the way the briefs describe", () => {
  const byId = (id) => shellLevels.find((l) => l.id === id);

  let s = createSession(byId("port-clash"));
  assert.match(text(s.exec("docker run -d --name web -p 80:80 nginx:1.27")), /port is already allocated/);

  s = createSession(byId("image-tag"));
  assert.match(text(s.exec("docker run -d --name app myorg/app:latest")), /pull access denied/);

  s = createSession(byId("missing-env"));
  assert.match(text(s.exec("docker run -d --name api -p 8080:8080 myapp:1.0")), /already in use/);
  assert.match(text(s.exec("docker rm api")), /^api$/);
  s.exec("docker run -d --name api -p 8080:8080 myapp:1.0");
  assert.match(text(s.exec("docker logs api")), /DATABASE_URL is not set/);
});

test("oom level shows OOMKilled and rejects a too small limit", () => {
  const level = shellLevels.find((l) => l.id === "oom");
  const s = createSession(level);
  assert.match(text(s.exec("docker inspect worker | grep OOMKilled")), /true/);
  s.exec("docker rm worker");
  assert.equal(s.exec("docker run -d --name worker -m 128m worker:2.1").solved, false);
});

test("restarting a failing container does not fix it", () => {
  const s = createSession(shellLevels.find((l) => l.id === "missing-env"));
  s.exec("docker start api");
  assert.equal(s.exec("docker ps").lines.length, 1);
  assert.equal(s.exec("docker ps -a").lines.length, 2);
  assert.equal(level0Solved(s), false);
});
const level0Solved = (s) => shellLevels[0].isSolved(s.state);

test("log hunt: grep pipeline works and wrong answers are rejected", () => {
  const s = createSession(shellLevels.find((l) => l.id === "log-hunt"));
  const count = Number(text(s.exec("docker logs checkout | grep -c ERROR")));
  assert.ok(count > 3);
  assert.equal(text(s.exec("docker logs checkout | grep ERROR | head -n 2")).split("\n").length, 2);
  assert.equal(s.exec("answer catalog.internal").solved, false);
  assert.equal(s.exec("answer payments.internal").solved, true);
});

test("unknown commands, hints and scoring", () => {
  const level = shellLevels[0];
  const s = createSession(level);
  assert.match(text(s.exec("foo")), /command not found/);
  assert.match(text(s.exec("docker rm nope")), /No such container/);
  assert.match(text(s.exec("cat run-api.sh")), /docker run/);
  assert.match(text(s.exec("hint")), /Hint 1\/3/);
  assert.ok(levelScore(s, level.par) <= 80);
});
