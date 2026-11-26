const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_MESSAGES = 10;
const MAX_CONTENT = 1000;

const SYSTEM_PROMPT = [
  "You are the Duck, a friendly rubber-duck assistant inside a DevOps learning game.",
  "You help with AWS, Kubernetes, Linux, Git, Terraform, Docker and CI/CD questions, and you also happily answer silly or off-topic questions in a short, playful way.",
  "Keep answers under 120 words. Prefer concrete commands and point to official documentation by name.",
  "If you are not sure, say so instead of guessing. Never ask for or repeat secrets, passwords or access keys.",
].join(" ");

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function validate(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) return null;
  const messages = body.messages.slice(-MAX_MESSAGES);
  const clean = [];
  for (const message of messages) {
    if (!message || (message.role !== "user" && message.role !== "assistant")) return null;
    if (typeof message.content !== "string" || message.content.length === 0) return null;
    clean.push({ role: message.role, content: message.content.slice(0, MAX_CONTENT) });
  }
  return clean[clean.length - 1].role === "user" ? clean : null;
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (!origin || new URL(origin).host !== new URL(request.url).host) {
    return json({ error: "forbidden" }, 403);
  }
  if (!env.AI) return json({ error: "ai binding not configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const messages = validate(body);
  if (!messages) return json({ error: "invalid messages" }, 400);

  try {
    const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 300,
    });
    const reply = typeof result?.response === "string" ? result.response.trim() : "";
    if (!reply) return json({ error: "empty reply" }, 502);
    return json({ reply });
  } catch {
    return json({ error: "upstream error" }, 502);
  }
}
