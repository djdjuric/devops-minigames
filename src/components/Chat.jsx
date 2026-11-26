import { useEffect, useRef, useState } from "react";
import { localReply } from "../lib/localBot.js";

const GREETING = {
  role: "assistant",
  content: "Hi, I am the Duck. Ask me anything about DevOps, or something silly. I will not judge. Much.",
};

async function askServer(messages) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: messages.slice(-10) }),
  });
  if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
  const data = await response.json();
  if (typeof data.reply !== "string" || !data.reply) throw new Error("Empty reply");
  return data.reply;
}

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, open]);

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text.slice(0, 1000) }];
    setMessages(next);
    setInput("");
    setBusy(true);
    let reply;
    try {
      reply = await askServer(next.filter((m) => m !== GREETING));
    } catch {
      reply = localReply(text);
    }
    setMessages([...next, { role: "assistant", content: reply }]);
    setBusy(false);
  }

  if (!open) {
    return (
      <button className="chat-toggle" onClick={() => setOpen(true)} aria-label="Open chat helper">
        Ask the Duck
      </button>
    );
  }

  return (
    <section className="chat" aria-label="Chat helper">
      <div className="chat-head">
        <strong>The Duck</strong>
        <button className="btn small" onClick={() => setOpen(false)} aria-label="Close chat">
          Close
        </button>
      </div>
      <div className="chat-log" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={`msg ${m.role}`}>
            {m.content}
          </p>
        ))}
        {busy && <p className="msg assistant">Thinking...</p>}
        <div ref={endRef} />
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about DevOps..."
          maxLength={1000}
          aria-label="Your message"
        />
        <button className="btn primary" disabled={busy}>
          Send
        </button>
      </form>
    </section>
  );
}
