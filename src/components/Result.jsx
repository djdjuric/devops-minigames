export default function Result({ score, max, best, isNewBest, onReplay, onHome }) {
  const pct = max ? Math.round((score / max) * 100) : 0;
  const verdict = pct >= 90 ? "Production ready" : pct >= 60 ? "Solid, keep practising" : "Time to read some docs";
  return (
    <div className="card result">
      <h2>{verdict}</h2>
      <p className="big">
        {score} / {max}
      </p>
      <p>{isNewBest ? "New personal best!" : `Personal best: ${best}`}</p>
      <div className="row">
        <button className="btn primary" onClick={onReplay}>
          Play again
        </button>
        <button className="btn" onClick={onHome}>
          All games
        </button>
      </div>
    </div>
  );
}
