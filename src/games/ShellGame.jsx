import { useState } from "react";
import { useDuckScreen } from "../components/DuckContext.jsx";
import { shellLevels } from "../data/shellLevels.js";
import { createSession, levelScore } from "../lib/shell/session.js";
import DocLink from "../components/DocLink.jsx";
import Points from "../components/Points.jsx";
import Terminal from "../components/Terminal.jsx";

const MAX_PER_LEVEL = 100;

function Level({ level, index, total, score, onDone }) {
  useDuckScreen({ id: `shell-${level.id}`, title: level.title, summary: level.brief, concepts: ["evidence-first debugging", "Docker state", "logs and inspection"], hint: level.hints[0] });
  const [session] = useState(() => createSession(level));
  const [lines, setLines] = useState([{ text: "Type help to see what you can run.", kind: "info" }]);
  const [outcome, setOutcome] = useState(null);

  function run(command) {
    const result = session.exec(command);
    setLines((current) => [
      ...(result.clear ? [] : current),
      ...(result.clear ? [] : [{ text: `$ ${command}`, kind: "cmd" }]),
      ...result.lines,
    ]);
    if (result.solved && !outcome) {
      setOutcome({ points: levelScore(session, level.par), skipped: false });
    }
  }

  function giveUp() {
    setOutcome({ points: 0, skipped: true });
  }

  function hint() {
    run("hint");
  }

  return (
    <div>
      <div className="progress">
        <span>
          Level {index + 1} / {total}
        </span>
        <span className="tag">{level.topic}</span>
        <Points value={score} />
      </div>
      <div className="card">
        <h3>{level.title}</h3>
        <p>{level.brief}</p>
        <p className="goal">
          <strong>Goal:</strong> {level.goal}
        </p>
      </div>
      <Terminal lines={lines} onCommand={run} disabled={Boolean(outcome)} />
      {!outcome && (
        <div className="row">
          <button className="btn" onClick={hint}>
            Hint (-20 pts)
          </button>
          <button className="btn" onClick={giveUp}>
            Give up and show solution
          </button>
        </div>
      )}
      {outcome && (
        <div className={`feedback ${outcome.skipped ? "bad" : "good"}`} role="status">
          <strong>{outcome.skipped ? "Solution" : `Fixed! +${outcome.points} pts`}</strong>
          {outcome.skipped && (
            <pre className="code">{level.solution.map((command) => `$ ${command}`).join("\n")}</pre>
          )}
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

export default function ShellGame({ onFinish }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  function done(points) {
    const total = score + points;
    if (index + 1 >= shellLevels.length) {
      onFinish(total, shellLevels.length * MAX_PER_LEVEL);
      return;
    }
    setScore(total);
    setIndex(index + 1);
  }

  return (
    <Level key={shellLevels[index].id} level={shellLevels[index]} index={index} total={shellLevels.length} score={score} onDone={done} />
  );
}
