import { useState } from "react";

export default function Points({ value }) {
  const [previous, setPrevious] = useState(value);
  const [delta, setDelta] = useState(0);
  if (value !== previous) {
    setDelta(value - previous);
    setPrevious(value);
  }
  return (
    <span className="points">
      <span key={value} className="points-value">
        {value} pts
      </span>
      {delta > 0 && (
        <span key={`gain-${value}`} className="points-gain" aria-hidden="true">
          +{delta}
        </span>
      )}
    </span>
  );
}
