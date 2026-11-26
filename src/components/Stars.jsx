export default function Stars({ count, label = true }) {
  return (
    <span className="stars" role={label ? "img" : undefined} aria-label={label ? `${count} of 3 stars` : undefined}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`star ${i < count ? "on" : ""}`} aria-hidden="true" />
      ))}
    </span>
  );
}
