import { useState } from "react";
import { incidents } from "../data/incidents.js";
import Feedback from "../components/Feedback.jsx";
import Progress from "../components/Progress.jsx";

const POINTS = 10;
const total = incidents.reduce((n, i) => n + i.steps.length, 0);

export default function IncidentGame({ onFinish }) {
  const [incidentIndex, setIncidentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [score, setScore] = useState(0);
  const [choice, setChoice] = useState(null);

  const incident = incidents[incidentIndex];
  const step = incident.steps[stepIndex];
  const answered = choice !== null;
  const isLast = incidentIndex + 1 >= incidents.length && stepIndex + 1 >= incident.steps.length;

  function answer(option) {
    if (answered) return;
    setChoice(option);
    setDone(done + 1);
    if (option.good) setScore(score + POINTS);
  }

  function next() {
    if (isLast) {
      onFinish(score, total * POINTS);
      return;
    }
    setChoice(null);
    if (stepIndex + 1 >= incident.steps.length) {
      setIncidentIndex(incidentIndex + 1);
      setStepIndex(0);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  return (
    <div>
      <Progress current={done} total={total} score={score} />
      <div className="card">
        <span className="tag">{incident.topic}</span>
        <h3>{incident.title}</h3>
        {stepIndex === 0 && <p>{incident.intro}</p>}
        {step.logs.length > 0 && <pre className="code terminal">{step.logs.join("\n")}</pre>}
        <p className="lead">{step.prompt}</p>
        <div className="options">
          {step.options.map((option) => {
            const state = !answered ? "" : option.good ? "right" : option === choice ? "wrong" : "";
            return (
              <button key={option.text} className={`btn option ${state}`} disabled={answered} onClick={() => answer(option)}>
                {option.text}
              </button>
            );
          })}
        </div>
      </div>
      {answered && (
        <Feedback correct={choice.good} explain={choice.why} doc={incident.doc} onNext={next} last={isLast} />
      )}
    </div>
  );
}
