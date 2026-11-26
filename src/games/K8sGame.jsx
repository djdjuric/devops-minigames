import { useEffect, useState } from "react";
import { useDuckScreen } from "../components/DuckContext.jsx";
import DocLink from "../components/DocLink.jsx";
import Points from "../components/Points.jsx";
import { k8sLevels } from "../data/k8sLevels.js";
import { simulateDeployment, simulationScore } from "../lib/k8sSim.js";

const MEMORY = [64, 128, 256, 384, 512, 768, 1024];

function NumberControl({ label, value, min, max, onChange, disabled }) {
  return (
    <label className="sim-control">
      <span>{label}</span>
      <div className="stepper">
        <button className="btn small" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
          −
        </button>
        <strong>{value}</strong>
        <button className="btn small" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </label>
  );
}

function Level({ level, index, total, score, onDone }) {
  useDuckScreen({ id: `k8s-${level.id}`, title: level.title, summary: level.brief, concepts: ["readiness", "capacity", "resource requests and limits", "rolling updates"], hint: level.hints[0] });
  const [config, setConfig] = useState(level.initial);
  const [result, setResult] = useState(() => simulateDeployment(level, level.initial));
  const [phase, setPhase] = useState("editing");
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    if (phase !== "deploying") return undefined;
    const id = setTimeout(() => {
      const next = simulateDeployment(level, config);
      setResult(next);
      setAttempts((value) => value + 1);
      setPhase("result");
      if (next.solved) setOutcome({ points: simulationScore(attempts + 1, hintsUsed), skipped: false });
    }, 1100);
    return () => clearTimeout(id);
  }, [phase, config, level, attempts, hintsUsed]);

  const set = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
    if (phase === "result") setPhase("editing");
  };
  const locked = phase === "deploying" || Boolean(outcome);
  const displayed = phase === "deploying" ? { ...result, pods: Array.from({ length: config.replicas }, (_, i) => ({ id: `pending-${i}`, state: "Starting", ready: false })) } : result;

  return (
    <div>
      <div className="progress">
        <span>Level {index + 1} / {total}</span>
        <span className="tag">Kubernetes</span>
        <Points value={score} />
      </div>
      <div className="card">
        <h3>{level.title}</h3>
        <p>{level.brief}</p>
      </div>

      <section className="k8s-cluster" aria-label="Kubernetes deployment simulation">
        <div className="traffic-meter">
          <span>Incoming</span>
          <strong>{level.traffic} req/s</strong>
          <span className="traffic-line" aria-hidden="true" />
        </div>
        <div className="service-box">
          <strong>Service</strong>
          <small>{displayed.readyPods ?? 0} Ready endpoints</small>
        </div>
        <div className="pod-grid">
          {displayed.pods.map((pod) => (
            <div key={pod.id} className={`pod ${pod.state.toLowerCase()}`}>
              <span className="pod-dot" />
              <strong>{pod.id}</strong>
              <small>{pod.state}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="sim-layout">
        <div className="card sim-controls">
          <h3>Deployment manifest</h3>
          <NumberControl label="Replicas" value={config.replicas} min={1} max={6} disabled={locked} onChange={(v) => set("replicas", v)} />
          <label className="sim-control">
            <span>Memory request</span>
            <select value={config.memoryRequest} disabled={locked} onChange={(e) => set("memoryRequest", Number(e.target.value))}>
              {MEMORY.map((m) => <option key={m} value={m}>{m} MiB</option>)}
            </select>
          </label>
          <label className="sim-control">
            <span>Memory limit</span>
            <select value={config.memoryLimit} disabled={locked} onChange={(e) => set("memoryLimit", Number(e.target.value))}>
              {MEMORY.map((m) => <option key={m} value={m}>{m} MiB</option>)}
            </select>
          </label>
          <label className="sim-control">
            <span>Readiness path</span>
            <input value={config.readinessPath} disabled={locked} onChange={(e) => set("readinessPath", e.target.value)} spellCheck={false} />
          </label>
          {level.requireZeroDowntime && (
            <>
              <NumberControl label="maxUnavailable" value={config.maxUnavailable} min={0} max={3} disabled={locked} onChange={(v) => set("maxUnavailable", v)} />
              <NumberControl label="maxSurge" value={config.maxSurge} min={0} max={3} disabled={locked} onChange={(v) => set("maxSurge", v)} />
            </>
          )}
        </div>

        <div className="card checks">
          <h3>Live checks</h3>
          {result.checks.map((check) => (
            <div key={check.id} className={`check ${phase === "editing" && attempts === 0 ? "unknown" : check.pass ? "pass" : "fail"}`}>
              <span className="check-mark" aria-hidden="true" />
              {check.label}
            </div>
          ))}
          <div className="capacity">
            <span>Capacity</span>
            <strong>{result.capacity} / {level.traffic} req/s</strong>
          </div>
        </div>
      </div>

      {!outcome && (
        <div className="row">
          <button className="btn primary" disabled={phase === "deploying"} onClick={() => setPhase("deploying")}>
            {phase === "deploying" ? "Rolling out..." : "Apply deployment"}
          </button>
          <button className="btn" disabled={phase === "deploying" || hintsUsed >= level.hints.length} onClick={() => setHintsUsed((n) => n + 1)}>
            Hint (-20 pts)
          </button>
          <button className="btn" disabled={phase === "deploying"} onClick={() => setOutcome({ points: 0, skipped: true })}>
            Give up
          </button>
        </div>
      )}
      {hintsUsed > 0 && !outcome && (
        <div className="card hints">
          {level.hints.slice(0, hintsUsed).map((hint, i) => <p key={hint}><strong>Hint {i + 1}:</strong> {hint}</p>)}
        </div>
      )}
      {outcome && (
        <div className={`feedback ${outcome.skipped ? "bad" : "good"}`} role="status">
          <strong>{outcome.skipped ? "Mission debrief" : `Deployment healthy! +${outcome.points} pts`}</strong>
          <p>{level.learned}</p>
          <div className="feedback-actions">
            <DocLink href={level.doc} />
            <button className="btn primary" onClick={() => onDone(outcome.points)} autoFocus>{index + 1 >= total ? "Finish" : "Next level"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function K8sGame({ onFinish }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  function done(points) {
    const next = score + points;
    if (index + 1 >= k8sLevels.length) onFinish(next, k8sLevels.length * 100);
    else {
      setScore(next);
      setIndex((value) => value + 1);
    }
  }
  return <Level key={k8sLevels[index].id} level={k8sLevels[index]} index={index} total={k8sLevels.length} score={score} onDone={done} />;
}
