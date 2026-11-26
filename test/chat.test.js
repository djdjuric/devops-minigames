import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/chat.js";

const URL_ = "https://game.example/api/chat";

function call(body, { origin = "https://game.example", env } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  const request = new Request(URL_, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return onRequestPost({ request, env });
}

const okEnv = (captured = {}) => ({
  AI: {
    run: async (model, input) => {
      captured.model = model;
      captured.input = input;
      return { response: " quack " };
    },
  },
});

test("rejects missing or foreign origin", async () => {
  const body = { messages: [{ role: "user", content: "hi" }] };
  assert.equal((await call(body, { origin: null, env: okEnv() })).status, 403);
  assert.equal((await call(body, { origin: "https://evil.example", env: okEnv() })).status, 403);
});

test("503 without AI binding", async () => {
  const res = await call({ messages: [{ role: "user", content: "hi" }] }, { env: {} });
  assert.equal(res.status, 503);
});

test("rejects bad payloads", async () => {
  for (const bad of ["not json", {}, { messages: [] }, { messages: [{ role: "system", content: "x" }] }, { messages: [{ role: "assistant", content: "x" }] }]) {
    assert.equal((await call(bad, { env: okEnv() })).status, 400);
  }
});

test("returns the model reply and bounds the input", async () => {
  const captured = {};
  const messages = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(5000) }));
  messages.push({ role: "user", content: "last" });
  const res = await call({
    messages,
    context: { title: "Shell Lab", summary: "x".repeat(5000), concepts: ["Docker", 42, "logs"] },
  }, { env: okEnv(captured) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: "quack" });
  const sent = captured.input.messages;
  assert.equal(sent[0].role, "system");
  assert.equal(sent[1].role, "system");
  assert.match(sent[1].content, /untrusted descriptive data/);
  assert.match(sent[1].content, /Shell Lab/);
  assert.ok(sent[1].content.length < 1200);
  assert.equal(sent.length, 12);
  assert.ok(sent.slice(2).every((m) => m.content.length <= 1000));
});

test("502 when the model fails", async () => {
  const env = { AI: { run: async () => { throw new Error("boom"); } } };
  const res = await call({ messages: [{ role: "user", content: "hi" }] }, { env });
  assert.equal(res.status, 502);
});
