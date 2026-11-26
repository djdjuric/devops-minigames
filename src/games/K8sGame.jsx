import { useState } from "react";
import { useDuckScreen } from "../components/DuckContext.jsx";
import DocLink from "../components/DocLink.jsx";
import Points from "../components/Points.jsx";
import { k8sLevels } from "../data/k8sLevels.js";
import {
  chooseAction,
  continueMission,
  currentStep,
  displayedScene,
  initialMissionState,
  missionScore,
  revealHint,
} from "../lib/k8sSim.js";

function Metrics({ scene }) {
  return (
    <div className="ops-metrics" aria-label="Live workload metrics">
      <div><span>Status</span><strong className={`status-${scene.status.toLowerCase().replaceAll(" ", "-")}`}>{scene.status}</strong></div>
      <div><span>Traffic</span><strong>{scene.traffic}</strong></div>
      <div><span>Error rate</span><strong>{scene.errorRate}</strong></div>
      <div><span>p95 latency</span><strong>{scene.latency}</strong></div>
    </div>
  );
}

function WorkloadMap({ scene, animating }) {
  return (
    <section className={`workload-map ${animating ? "changing" : ""}`} aria-label="Live Kubernetes workload">
      <div className="traffic-source">
        <small>Users</small>
        <strong>{scene.traffic}</strong>
      </div>
      <span className="flow-arrow" aria-hidden="true" />
      <div className="lb-box">
        <small>Load balancer</small>
        <strong>Service</strong>
      </div>
      <span className="flow-arrow" aria-hidden="true" />
      <div className="workload-targets">
        {scene.pods.map((pod) => (
          <div key={pod.name} className={`workload-pod ${pod.state.toLowerCase()}`}>
            <span className="pod-dot" aria-hidden="true" />
            <strong>{pod.name}</strong>
            <small>{pod.version} · {pod.state}</small>
            <small>{pod.zone}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Evidence({ scene }) {
  return (
    <div className="ops-evidence">
      <div className="card">
        <h3>Traffic flow</h3>
        {scene.routes?.length ? (
          <ol className="route-list">{scene.routes.map((route) => <li key={route}>{route}</li>)}</ol>
        ) : <p className="muted">Service routes to Ready endpoints.</p>}
      </div>
      <div className="card event-log">
        <h3>Events and signals</h3>
        {scene.events.map((event) => <p key={event}><span aria-hidden="true">›</span> {event}</p>)}
      </div>
    </div>
  );
}

function Level({ level, index, total, score, onDone }) {
  const [state, setState] = useState(initialMissionState);
  const [gaveUp, setGaveUp] = useState(false);
  const step = currentStep(level, state);
  const scene = displayedScene(level, state);
  const finished = state.solved || gaveUp;
  const points = gaveUp ? 0 : missionScore(state);

  useDuckScreen({
    id: `k8s-${level.id}-${state.stepIndex}`,
    title: level.title,
    summary: `${level.brief} Current signal: ${scene.status}. Decision: ${step?.prompt ?? "Review the debrief."}`,
    concepts: level.concepts,
    hint: level.hints[Math.min(state.hintsUsed, level.hints.length - 1)],
  });

  function select(actionId) {
    setState((current) => chooseAction(level, current, actionId));
  }

  function proceed() {
    setState((current) => continueMission(level, current));
  }

  return (
    <div>
      <div className="progress">
        <span>Scenario {index + 1} / {total}</span>
        <span className="bar" aria-hidden="true"><span style={{ width: `${((index + state.stepIndex / level.steps.length) / total) * 100}%` }} /></span>
        <Points value={score} />
      </div>

      <div className="card ops-brief">
        <div><span className="tag">Kubernetes operations</span><h3>{level.title}</h3><p>{level.brief}</p></div>
        <span className="step-counter">Decision {Math.min(state.stepIndex + 1, level.steps.length)} / {level.steps.length}</span>
      </div>

      <Metrics scene={scene} />
      <WorkloadMap scene={scene} animating={Boolean(state.selection)} />
      <Evidence scene={scene} />

      {!finished && (
        <section className="card decision-panel">
          <span className="decision-label">Your next action</span>
          <h3>{step.prompt}</h3>
          <div className="decision-options">
            {step.actions.map((candidate) => (
              <button
                key={candidate.id}
                className={`btn decision-option ${state.selection?.id === candidate.id ? (candidate.good ? "right" : "wrong") : ""}`}
                disabled={Boolean(state.selection)}
                onClick={() => select(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          {state.selection && (
            <div className={`feedback ${state.selection.good ? "good" : "bad"}`} role="status">
              <strong>{state.selection.good ? "Good operational call" : "That increases risk"}</strong>
              <p>{state.selection.outcome}</p>
              <button className={`btn ${state.selection.good ? "primary" : ""}`} onClick={proceed} autoFocus>
                {state.selection.good ? (state.stepIndex + 1 >= level.steps.length ? "Complete scenario" : "Continue incident") : "Try another action"}
              </button>
            </div>
          )}
        </section>
      )}

      {!finished && !state.selection && (
        <div className="row">
          <button className="btn" disabled={state.hintsUsed >= level.hints.length} onClick={() => setState((current) => revealHint(level, current))}>Hint (-20 pts)</button>
          <button className="btn" onClick={() => setGaveUp(true)}>Show debrief</button>
        </div>
      )}
      {!finished && state.hintsUsed > 0 && (
        <div className="card hints">
          {level.hints.slice(0, state.hintsUsed).map((hint, hintIndex) => <p key={hint}><strong>Hint {hintIndex + 1}:</strong> {hint}</p>)}
        </div>
      )}

      {finished && (
        <div className={`feedback ${gaveUp ? "bad" : "good"}`} role="status">
          <strong>{gaveUp ? "Scenario debrief" : `Incident resolved! +${points} pts`}</strong>
          {gaveUp && (
            <ol>{level.steps.slice(state.stepIndex).map((remaining) => <li key={remaining.id}>{remaining.actions.find((candidate) => candidate.good).label}</li>)}</ol>
          )}
          <p>{level.learned}</p>
          <div className="feedback-actions">
            <DocLink href={level.doc} />
            <button className="btn primary" onClick={() => onDone(points)} autoFocus>{index + 1 >= total ? "Finish" : "Next scenario"}</button>
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
