import { useEffect, useState } from "react";
import { starsFor } from "../lib/profile.js";
import Stars from "./Stars.jsx";

function CountUp({ to }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (to === 0) return undefined;
    const steps = 24;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setValue(Math.round((to * step) / steps));
      if (step >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [to]);
  return <>{value}</>;
}

export default function Result({ outcome, score, max, onReplay, onHome }) {
  const { pct, xpGained, bonusXp, unlocked, isNewBest, best, rankBefore, rankAfter, rankedUp } = outcome;
  const [barWidth, setBarWidth] = useState(rankedUp ? 0 : rankBefore.progress);
  useEffect(() => {
    const id = setTimeout(() => setBarWidth(rankAfter.progress), 50);
    return () => clearTimeout(id);
  }, [rankAfter.progress]);
  const verdict = pct >= 90 ? "Production ready" : pct >= 60 ? "Solid, keep practising" : "Time to read some docs";

  return (
    <div className="card result">
      <h2>{verdict}</h2>
      <Stars count={starsFor(pct)} />
      <p className="big">
        <CountUp to={score} /> <span className="muted">/ {max}</span>
      </p>
      {isNewBest ? <p className="new-best">New personal best</p> : <p className="muted">Personal best: {best}</p>}

      <div className="xp-panel">
        <div className="xp-line">
          <strong>+{xpGained} XP</strong>
          {bonusXp > 0 && <span className="muted"> and +{bonusXp} XP trophy bonus</span>}
        </div>
        <div className="xpbar big-bar" aria-hidden="true">
          <span style={{ width: `${Math.round(barWidth * 100)}%` }} />
        </div>
        <p className="muted">
          {rankAfter.name}
          {rankAfter.next ? ` · ${rankAfter.toNext} XP to ${rankAfter.next.name}` : " · top rank reached"}
        </p>
        {rankedUp && <p className="promoted">Promoted to {rankAfter.name}</p>}
      </div>

      {unlocked.length > 0 && (
        <div className="unlocked">
          <h3>Trophy unlocked</h3>
          {unlocked.map((a) => (
            <div key={a.id} className="trophy on">
              <span className="trophy-icon" aria-hidden="true" />
              <div>
                <strong>{a.name}</strong>
                <p>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row center">
        <button className="btn primary" onClick={onReplay} autoFocus>
          Play again
        </button>
        <button className="btn" onClick={onHome}>
          All games
        </button>
      </div>
    </div>
  );
}
