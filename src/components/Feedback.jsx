import DocLink from "./DocLink.jsx";

export default function Feedback({ correct, explain, doc, onNext, last }) {
  return (
    <div className={`feedback ${correct ? "good" : "bad"}`} role="status">
      <strong>{correct ? "Correct" : "Not quite"}</strong>
      <p>{explain}</p>
      <div className="feedback-actions">
        {doc && <DocLink href={doc} />}
        <button className="btn primary" onClick={onNext} autoFocus>
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
