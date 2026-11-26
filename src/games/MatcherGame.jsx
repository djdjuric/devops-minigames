import { useState } from "react";
import { matcherPairs } from "../data/matcher.js";
import { sample, shuffle } from "../lib/util.js";
import DocLink from "../components/DocLink.jsx";
import Points from "../components/Points.jsx";

const PAIRS = 8;
const POINTS = 10;
const PENALTY = 3;

export default function MatcherGame({ onFinish }) {
  const [pairs] = useState(() => sample(matcherPairs, PAIRS));
  const [terms] = useState(() => shuffle(pairs.map((p) => p.term)));
  const [descs] = useState(() => shuffle(pairs.map((p) => p.desc)));
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState(null);

  const done = matched.length === pairs.length;
  const score = Math.max(0, pairs.length * POINTS - mistakes * PENALTY);

  function pickTerm(term) {
    if (matched.includes(term)) return;
    setWrong(null);
    setSelected(term);
  }

  function pickDesc(desc) {
    if (!selected) return;
    const pair = pairs.find((p) => p.term === selected);
    if (pair.desc === desc) {
      setMatched([...matched, selected]);
    } else {
      setMistakes(mistakes + 1);
      setWrong(desc);
    }
    setSelected(null);
  }

  const descMatched = (desc) => matched.includes(pairs.find((p) => p.desc === desc).term);

  return (
    <div>
      <div className="progress">
        <span>
          Matched {matched.length} / {pairs.length}
        </span>
        <span>Mistakes: {mistakes}</span>
        <Points value={score} />
      </div>
      <p className="lead">Pick a term, then pick its description.</p>
      <div className="columns">
        <div className="options">
          {terms.map((term) => (
            <button
              key={term}
              className={`btn option ${matched.includes(term) ? "right" : ""} ${selected === term ? "selected" : ""}`}
              disabled={matched.includes(term)}
              onClick={() => pickTerm(term)}
            >
              {term}
            </button>
          ))}
        </div>
        <div className="options">
          {descs.map((desc) => (
            <button
              key={desc}
              className={`btn option ${descMatched(desc) ? "right" : ""} ${wrong === desc ? "wrong" : ""}`}
              disabled={descMatched(desc) || !selected}
              onClick={() => pickDesc(desc)}
            >
              {desc}
            </button>
          ))}
        </div>
      </div>
      {done && (
        <div className="feedback good" role="status">
          <strong>All matched</strong>
          <ul className="doc-list">
            {pairs.map((pair) => (
              <li key={pair.term}>
                {pair.term} <DocLink href={pair.doc}>docs</DocLink>
              </li>
            ))}
          </ul>
          <button className="btn primary" onClick={() => onFinish(score, pairs.length * POINTS)}>
            Finish
          </button>
        </div>
      )}
    </div>
  );
}
