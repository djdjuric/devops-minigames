import { useState } from "react";
import { iamScenarios } from "../data/iam.js";
import { shuffle } from "../lib/util.js";
import Feedback from "../components/Feedback.jsx";
import Progress from "../components/Progress.jsx";

const POINTS = 10;

export default function IamGame({ onFinish }) {
  const [scenarios] = useState(() => shuffle(iamScenarios));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choice, setChoice] = useState(null);

  const scenario = scenarios[index];
  const answered = choice !== null;
  const correct = choice === scenario.answer;

  function answer(value) {
    if (answered) return;
    setChoice(value);
    if (value === scenario.answer) setScore((s) => s + POINTS);
  }

  function next() {
    if (index + 1 >= scenarios.length) {
      onFinish(score, scenarios.length * POINTS);
      return;
    }
    setIndex(index + 1);
    setChoice(null);
  }

  return (
    <div>
      <Progress current={index} total={scenarios.length} score={score} />
      <p className="lead">Is this request allowed or denied?</p>
      {scenario.policies.map((policy, i) => {
        const { label, ...doc } = policy;
        return (
          <div className="card" key={i}>
            {label && <h3>{label}</h3>}
            <pre className="code">{JSON.stringify(doc, null, 2)}</pre>
          </div>
        );
      })}
      <div className="card request">
        <h3>Request</h3>
        <p>
          <code>{scenario.request.action}</code> on <code>{scenario.request.resource}</code>
        </p>
        {scenario.request.context && (
          <p>
            Context:{" "}
            {typeof scenario.request.context === "string" ? (
              scenario.request.context
            ) : (
              <code>{JSON.stringify(scenario.request.context)}</code>
            )}
          </p>
        )}
      </div>
      <div className="row">
        {["Allow", "Deny"].map((value) => (
          <button
            key={value}
            className={`btn ${value === "Allow" ? "allow" : "deny"}`}
            disabled={answered}
            onClick={() => answer(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {answered && (
        <Feedback
          correct={correct}
          explain={`${scenario.answer}. ${scenario.explain}`}
          doc={scenario.doc}
          onNext={next}
          last={index + 1 >= scenarios.length}
        />
      )}
    </div>
  );
}
