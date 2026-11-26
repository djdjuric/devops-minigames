import { useEffect, useRef, useState } from "react";
import { localReply } from "../lib/localBot.js";
import { useDuck } from "./DuckContext.jsx";

const GREETING = {
  role: "assistant",
  content: "Quack. I am your DevOps rubber duck. I explain the current screen, help you reason through missions, and refuse to judge the command history.",
};

async function askServer(messages, screen) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.slice(-10),
      context: {
        title: screen.title,
        summary: screen.summary,
        concepts: screen.concepts,
      },
    }),
  });
  if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
  const data = await response.json();
  if (typeof data.reply !== "string" || !data.reply) throw new Error("Empty reply");
  return data.reply;
}

export default function Chat() {
  const { screen } = useDuck();
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(true);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const lastScreen = useRef(screen.id);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (lastScreen.current !== screen.id) {
      lastScreen.current = screen.id;
      setBubble(true);
    }
  }, [screen.id]);

  async function sendText(raw) {
    const text = raw.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text.slice(0, 1000) }];
    setMessages(next);
    setInput("");
    setBusy(true);
    let reply;
    try {
      reply = await askServer(next.filter((message) => message !== GREETING), screen);
    } catch {
      reply = localReply(text, screen);
    }
    setMessages([...next, { role: "assistant", content: reply }]);
    setBusy(false);
  }

  function submit(event) {
    event.preventDefault();
    void sendText(input);
  }

  function quick(text) {
    setOpen(true);
    setBubble(false);
    void sendText(text);
  }

  return (
    <aside className={`duck-guide ${open ? "open" : ""}`} aria-label="Duck learning assistant">
      {!open && bubble && (
        <div key={`bubble-${screen.id}`} className="duck-bubble speaking" role="status">
          <button className="bubble-close" onClick={() => setBubble(false)} aria-label="Dismiss Duck explanation">
            ×
          </button>
          <span className="duck-quack" aria-hidden="true">Quack, operator.</span>
          <strong>{screen.title}</strong>
          <p>{screen.summary}</p>
          <button className="text-button" onClick={() => quick("Explain this screen")}>Explain it</button>
        </div>
      )}

      {open && (
        <section className="chat" aria-label="Chat with the Duck">
          <div className="chat-head">
            <div className="chat-identity">
              <span className={`duck-mini ${busy ? "speaking" : ""}`} aria-hidden="true">
                <span className="duck-eye" />
                <span className="duck-bill" />
              </span>
              <span>
                <strong>The Duck</strong>
                <small>{busy ? "Thinking out loud..." : screen.title}</small>
              </span>
            </div>
            <button className="btn small" onClick={() => setOpen(false)} aria-label="Minimize chat">
              Minimize
            </button>
          </div>
          <div className="chat-quick" aria-label="Quick questions">
            <button onClick={() => void sendText("Explain this screen")}>Explain screen</button>
            <button onClick={() => void sendText("What should I learn here?")}>Learning goal</button>
            <button onClick={() => void sendText("I am stuck. Give me a conceptual hint, not the answer.")}>Hint</button>
          </div>
          <div className="chat-log" aria-live="polite">
            {messages.map((message, index) => (
              <p key={index} className={`msg ${message.role}`}>
                {message.content}
              </p>
            ))}
            {busy && <p className="msg assistant">Thinking... quiet quack...</p>}
            <div ref={endRef} />
          </div>
          <form className="chat-form" onSubmit={submit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the Duck..."
              maxLength={1000}
              aria-label="Your message"
            />
            <button className="btn primary" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      {!open && (
        <button
          key={`avatar-${screen.id}`}
          className={`duck-avatar ${bubble ? "speaking" : ""}`}
          onClick={() => {
            setOpen(true);
            setBubble(false);
          }}
          aria-label="Open the Duck assistant"
        >
          <span className="duck-eye" aria-hidden="true" />
          <span className="duck-bill" aria-hidden="true" />
          <span className="duck-label">Duck</span>
        </button>
      )}
    </aside>
  );
}
