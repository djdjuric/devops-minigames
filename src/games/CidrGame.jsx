import { useState } from "react";
import { generateRounds } from "../lib/cidrRounds.js";
import Feedback from "../components/Feedback.jsx";
import Progress from "../components/Progress.jsx";

const POINTS = 10;

export default function CidrGame({ onFinish }) {
  const [rounds] = useState(() => generateRounds(9));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choice, setChoice] = useState(null);

  const round = rounds[index];
  const answered = choice !== null;

  function answer(value) {
    if (answered) return;
    setChoice(value);
    if (value === round.answer) setScore((s) => s + POINTS);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      onFinish(score, rounds.length * POINTS);
      return;
    }
    setIndex(index + 1);
    setChoice(null);
  }

  return (
    <div>
      <Progress current={index} total={rounds.length} score={score} />
      <div className="card">
        <p className="lead">{round.question}</p>
        <div className="options">
          {round.options.map((option) => {
            const state = !answered ? "" : option === round.answer ? "right" : option === choice ? "wrong" : "";
            return (
              <button key={option} className={`btn option ${state}`} disabled={answered} onClick={() => answer(option)}>
                <code>{option}</code>
              </button>
            );
          })}
        </div>
      </div>
      {answered && (
        <Feedback
          correct={choice === round.answer}
          explain={round.explain}
          doc={round.doc}
          onNext={next}
          last={index + 1 >= rounds.length}
        />
      )}
    </div>
  );
}
