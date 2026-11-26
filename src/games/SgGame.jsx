import { useEffect, useState } from "react";
import { useDuckScreen } from "../components/DuckContext.jsx";
import { sgLevels } from "../data/sgLevels.js";
import { allCorrect, PROTOCOLS, ruleError, runTraffic } from "../lib/sg.js";
import DocLink from "../components/DocLink.jsx";
import Points from "../components/Points.jsx";

const MAX_PER_LEVEL = 100;
let nextId = 1;
const withIds = (rules) => rules.map((r) => ({ ...r, id: nextId++ }));
const describeRule = (r) =>
  `${r.protocol.toUpperCase()}${r.protocol === "tcp" || r.protocol === "udp" ? ` ${r.from}-${r.to}` : ""} from ${r.source}`;

function packetOutcome(result) {
  if (result.correct) return result.allowed ? "Reached the server" : "Blocked";
  return result.allowed ? "Got through and should not have" : "Blocked but should have been allowed";
}

function RuleEditor({ rules, disabled, onChange }) {
  const update = (id, patch) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => onChange(rules.filter((r) => r.id !== id));
  const add = () => onChange([...rules, { id: nextId++, protocol: "tcp", from: "", to: "", source: "" }]);

  return (
    <div className="card">
      <h3>Inbound rules</h3>
      <div className="rules">
        <div className="rule head">
          <span>Protocol</span>
          <span>From</span>
          <span>To</span>
          <span>Source</span>
          <span />
        </div>
        {rules.map((rule) => {
          const portless = rule.protocol === "icmp" || rule.protocol === "all";
          const error = ruleError(rule);
          return (
            <div key={rule.id}>
              <div className="rule">
                <select
                  aria-label="Protocol"
                  value={rule.protocol}
                  disabled={disabled}
                  onChange={(e) => update(rule.id, { protocol: e.target.value })}
                >
                  {PROTOCOLS.map((p) => (
                    <option key={p} value={p}>
                      {p === "all" ? "all traffic" : p}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="From port"
                  inputMode="numeric"
                  value={portless ? "" : rule.from}
                  placeholder={portless ? "n/a" : "80"}
                  disabled={disabled || portless}
                  onChange={(e) => update(rule.id, { from: e.target.value })}
                />
                <input
                  aria-label="To port"
                  inputMode="numeric"
                  value={portless ? "" : rule.to}
                  placeholder={portless ? "n/a" : "80"}
                  disabled={disabled || portless}
                  onChange={(e) => update(rule.id, { to: e.target.value })}
                />
                <input
                  aria-label="Source CIDR"
                  value={rule.source}
                  placeholder="0.0.0.0/0"
                  disabled={disabled}
                  spellCheck={false}
                  onChange={(e) => update(rule.id, { source: e.target.value })}
                />
                <button className="btn small" disabled={disabled} onClick={() => remove(rule.id)} aria-label="Delete rule">
                  Delete
                </button>
              </div>
              {error && <div className="rule-error">{error} (this rule is ignored)</div>}
            </div>
          );
        })}
      </div>
      <button className="btn small" disabled={disabled} onClick={add}>
        Add rule
      </button>
    </div>
  );
}

function Level({ level, index, total, score, onDone }) {
  useDuckScreen({ id: `sg-${level.id}`, title: level.title, summary: level.brief, concepts: ["protocols", "port ranges", "source CIDRs", "default deny"], hint: level.hints[0] });
  const [rules, setRules] = useState(() => withIds(level.rules));
  const [results, setResults] = useState(null);
  const [phase, setPhase] = useState("edit");
  const [revealed, setRevealed] = useState(0);
  const [failedRuns, setFailedRuns] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    if (phase !== "running") return undefined;
    const id = setInterval(
      () => setRevealed((count) => Math.min(count + 1, level.packets.length)),
      650,
    );
    return () => clearInterval(id);
  }, [phase, level.packets.length]);

  useEffect(() => {
    if (phase !== "running" || revealed < level.packets.length) return undefined;
    const timer = setTimeout(() => {
      if (allCorrect(results)) {
        setOutcome({ points: Math.max(10, MAX_PER_LEVEL - failedRuns * 15 - hintsUsed * 20), skipped: false });
      } else {
        setFailedRuns((n) => n + 1);
      }
      setPhase("edit");
    }, 1200);
    return () => clearTimeout(timer);
  }, [phase, revealed, results, level.packets.length, failedRuns, hintsUsed]);

  function edit(next) {
    setRules(next);
    setResults(null);
    setRevealed(0);
  }

  function send() {
    setResults(runTraffic(rules, level.packets));
    setRevealed(0);
    setPhase("running");
  }

  const running = phase === "running";
  const locked = running || Boolean(outcome);
  const done = results && !running;

  return (
    <div>
      <div className="progress">
        <span>
          Level {index + 1} / {total}
        </span>
        <span className="tag">Security groups</span>
        <Points value={score} />
      </div>
      <div className="card">
        <h3>{level.title}</h3>
        <p>{level.brief}</p>
      </div>

      <div className="sg-field" aria-label="Traffic simulation">
        <div className="lanes">
          {level.packets.map((packet, i) => {
            const result = results?.[i];
            const go = result && i < revealed;
            const cls = ["packet"];
            if (go) cls.push("go", result.allowed ? "allowed" : "blocked", result.correct ? "ok" : "bad");
            return (
              <div className="lane" key={packet.label}>
                <div className={cls.join(" ")}>
                  <strong>{packet.label}</strong>
                  <small>
                    {packet.src} {packet.protocol.toUpperCase()}
                    {packet.port !== null ? `:${packet.port}` : ""}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
        <div className="shield" aria-hidden="true">
          <span>Security group</span>
        </div>
        <div className="server" aria-hidden="true">
          {level.server}
        </div>
      </div>

      {done && (
        <ul className="sg-results" aria-live="polite">
          {results.map((r) => (
            <li key={r.label} className={r.correct ? "ok" : "bad"}>
              <strong>{r.label}:</strong> {packetOutcome(r)}
            </li>
          ))}
        </ul>
      )}

      <RuleEditor rules={rules} disabled={locked} onChange={edit} />

      {!outcome && (
        <div className="row">
          <button className="btn primary" disabled={running} onClick={send}>
            {running ? "Sending..." : "Send traffic"}
          </button>
          <button
            className="btn"
            disabled={running || hintsUsed >= level.hints.length}
            onClick={() => setHintsUsed(hintsUsed + 1)}
          >
            Hint (-20 pts)
          </button>
          <button className="btn" disabled={running} onClick={() => setOutcome({ points: 0, skipped: true })}>
            Give up and show solution
          </button>
        </div>
      )}
      {!outcome && hintsUsed > 0 && (
        <div className="card">
          {level.hints.slice(0, hintsUsed).map((hint, i) => (
            <p key={i}>
              <strong>Hint {i + 1}:</strong> {hint}
            </p>
          ))}
        </div>
      )}
      {outcome && (
        <div className={`feedback ${outcome.skipped ? "bad" : "good"}`} role="status">
          <strong>{outcome.skipped ? "One valid solution" : `Server secured! +${outcome.points} pts`}</strong>
          {outcome.skipped && <pre className="code">{level.solution.map(describeRule).join("\n")}</pre>}
          <p>{level.learned}</p>
          <div className="feedback-actions">
            <DocLink href={level.doc} />
            <button className="btn primary" onClick={() => onDone(outcome.points)} autoFocus>
              {index + 1 >= total ? "Finish" : "Next level"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SgGame({ onFinish }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  function done(points) {
    const next = score + points;
    if (index + 1 >= sgLevels.length) {
      onFinish(next, sgLevels.length * MAX_PER_LEVEL);
      return;
    }
    setScore(next);
    setIndex(index + 1);
  }

  return <Level key={sgLevels[index].id} level={sgLevels[index]} index={index} total={sgLevels.length} score={score} onDone={done} />;
}
