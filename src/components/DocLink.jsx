export default function DocLink({ href, children = "Read the docs" }) {
  return (
    <a className="doc-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
