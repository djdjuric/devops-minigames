import { useEffect, useState } from "react";
import { quizQuestions } from "../data/quiz.js";
import { sample, shuffle } from "../lib/util.js";
import Feedback from "../components/Feedback.jsx";
import Progress from "../components/Progress.jsx";

const ROUNDS = 10;
const SECONDS = 20;
const POINTS = 10;

function buildQuestions() {
  return sample(quizQuestions, ROUNDS).map((item) => ({
    ...item,
    options: shuffle([item.correct, ...item.wrong]),
  }));
}

export default function QuizGame({ onFinish }) {
  const [questions] = useState(buildQuestions);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choice, setChoice] = useState(null);
  const [left, setLeft] = useState(SECONDS);

  const question = questions[index];
  const answered = choice !== null;

  useEffect(() => {
    if (answered) return undefined;
    const id = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          setChoice("");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [index, answered]);

  function answer(value) {
    if (answered) return;
    setChoice(value);
    if (value === question.correct) setScore((s) => s + POINTS + Math.floor(left / 5));
  }

  function next() {
    if (index + 1 >= questions.length) {
      onFinish(score, questions.length * (POINTS + Math.floor(SECONDS / 5)));
      return;
    }
    setIndex(index + 1);
    setChoice(null);
    setLeft(SECONDS);
  }

  return (
    <div>
      <Progress current={index} total={questions.length} score={score} />
      <div className="card">
        <div className="row between">
          <span className="tag">{question.topic}</span>
          <span className={`timer ${left <= 5 && !answered ? "low" : ""}`}>{left}s</span>
        </div>
        <p className="lead">{question.q}</p>
        <div className="options">
          {question.options.map((option) => {
            const state = !answered ? "" : option === question.correct ? "right" : option === choice ? "wrong" : "";
            return (
              <button key={option} className={`btn option ${state}`} disabled={answered} onClick={() => answer(option)}>
                {option}
              </button>
            );
          })}
        </div>
      </div>
      {answered && (
        <Feedback
          correct={choice === question.correct}
          explain={choice === "" ? `Time is up. ${question.explain}` : question.explain}
          doc={question.doc}
          onNext={next}
          last={index + 1 >= questions.length}
        />
      )}
    </div>
  );
}
