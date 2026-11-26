import { useState } from "react";
import { bugSnippets } from "../data/bugs.js";
import { shuffle } from "../lib/util.js";
import Feedback from "../components/Feedback.jsx";
import Progress from "../components/Progress.jsx";

const POINTS = 10;

export default function BugGame({ onFinish }) {
  const [snippets] = useState(() => shuffle(bugSnippets));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choice, setChoice] = useState(null);

  const snippet = snippets[index];
  const answered = choice !== null;

  function answer(line) {
    if (answered) return;
    setChoice(line);
    if (line === snippet.bug) setScore((s) => s + POINTS);
  }

  function next() {
    if (index + 1 >= snippets.length) {
      onFinish(score, snippets.length * POINTS);
      return;
    }
    setIndex(index + 1);
    setChoice(null);
  }

  return (
    <div>
      <Progress current={index} total={snippets.length} score={score} />
      <p className="lead">
        <span className="tag">{snippet.lang}</span> {snippet.title}: click the line with the bug or security problem.
      </p>
      <div className="card code-lines">
        {snippet.lines.map((text, i) => {
          const state = !answered ? "" : i === snippet.bug ? "right" : i === choice ? "wrong" : "";
          return (
            <button key={i} className={`code-line ${state}`} disabled={answered} onClick={() => answer(i)}>
              <span className="ln">{i + 1}</span>
              <code>{text || " "}</code>
            </button>
          );
        })}
      </div>
      {answered && (
        <Feedback
          correct={choice === snippet.bug}
          explain={snippet.explain}
          doc={snippet.doc}
          onNext={next}
          last={index + 1 >= snippets.length}
        />
      )}
    </div>
  );
}
