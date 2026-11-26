import { useEffect, useRef, useState } from "react";

export default function Terminal({ lines, onCommand, disabled }) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState([]);
  const [cursor, setCursor] = useState(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  function submit(event) {
    event.preventDefault();
    const command = value;
    setValue("");
    setCursor(null);
    if (command.trim()) setHistory((h) => [...h, command]);
    onCommand(command);
  }

  function onKeyDown(event) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (history.length === 0) return;
    const next =
      event.key === "ArrowUp"
        ? cursor === null
          ? history.length - 1
          : Math.max(0, cursor - 1)
        : cursor === null
          ? null
          : cursor + 1 >= history.length
            ? null
            : cursor + 1;
    setCursor(next);
    setValue(next === null ? "" : history[next]);
  }

  return (
    <div className="terminal-window" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-bar">player@devbox</div>
      <div className="terminal-log" ref={logRef} aria-live="polite">
        {lines.map((line, i) => (
          <div key={i} className={`t-line ${line.kind ?? ""} ${line.error ? "err" : ""}`}>
            {line.text || " "}
          </div>
        ))}
      </div>
      <form className="terminal-input" onSubmit={submit}>
        <label htmlFor="shell-input" className="prompt">
          $
        </label>
        <input
          id="shell-input"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          aria-label="Shell command"
        />
      </form>
    </div>
  );
}
