import { useDuckScreen } from "./DuckContext.jsx";

const sections = [
  {
    title: "How progress works",
    badge: "XP",
    text: "Every point you score becomes XP. Perfect runs add 25 XP, and each new trophy adds 50 XP. Best scores and stars are tracked per mission. One, two, and three stars require 40%, 70%, and 90%.",
  },
  {
    title: "How simulations work",
    badge: "SIM",
    text: "The simulations use deterministic browser-side engines. They do not run real infrastructure or commands. Your changes are evaluated against the same rules the real tool uses, then the UI visualizes the result.",
  },
  {
    title: "Security Group Defender",
    badge: "SG",
    text: "Each packet has a source IP, protocol, and destination port. An inbound rule must match all three. Security groups contain allow rules only; unmatched traffic is blocked by default.",
  },
  {
    title: "EKS Cluster Control Room",
    badge: "K8S",
    text: "Operate realistic Kubernetes incidents through visual traffic and workload state: roll out and roll back releases, repair Service selectors, evaluate canaries, autoscale workloads and nodes, fix Ingress paths, and protect availability during maintenance.",
  },
  {
    title: "Container Task Lab",
    badge: "SH",
    text: "The terminal implements a safe subset of Docker and Linux commands against an in-memory system. Container state, logs, ports, environment variables, mounts, and memory limits behave consistently across commands.",
  },
  {
    title: "The Duck",
    badge: "DUCK",
    text: "The Duck receives a short description of the current screen, not your browser data or saved progress. Workers AI answers when configured; a small offline helper handles screen explanations and common concepts when it is unavailable.",
  },
  {
    title: "What is saved",
    badge: "SAVE",
    text: "XP, rank, streak, trophies, stars, scores, and play counts are stored in localStorage. No account is required. Download a backup from the Trophy cabinet if you want to move progress to another browser.",
  },
  {
    title: "Why answers link to docs",
    badge: "DOC",
    text: "A game explanation is a starting point, not a source of truth. Each mission links to official AWS, Kubernetes, Docker, Git, Linux, or Terraform documentation so you can verify the mechanism and learn the real interface.",
  },
];

export default function Guide() {
  useDuckScreen({
    id: "guide",
    title: "How the game works",
    summary: "This guide explains scoring, persistence, simulations, the Duck, and why every lesson links to official documentation.",
    concepts: ["simulation engines", "learning feedback", "persistent progress", "source verification"],
    hint: "Open a simulation after reading its section and ask me to explain what changes on that screen.",
  });

  return (
    <>
      <a className="back" href="#/">All games</a>
      <h2 className="game-title">How it works</h2>
      <p className="lead">The game teaches mechanisms by letting you change a system and observe the result.</p>
      <div className="guide-grid">
        {sections.map((section) => (
          <section key={section.badge} className="card guide-card">
            <span className="badge">{section.badge}</span>
            <h3>{section.title}</h3>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
    </>
  );
}
