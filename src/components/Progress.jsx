import Points from "./Points.jsx";

export default function Progress({ current, total, score }) {
  return (
    <div className="progress">
      <span>
        Round {Math.min(current + 1, total)} / {total}
      </span>
      <span className="bar" aria-hidden="true">
        <span style={{ width: `${(current / total) * 100}%` }} />
      </span>
      <Points value={score} />
    </div>
  );
}
