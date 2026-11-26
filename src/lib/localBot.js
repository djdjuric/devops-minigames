const answers = [
  { keys: ["hello", "hi", "hey"], reply: "Quack. Ask me about AWS, Kubernetes, Linux, Git, or the mission on your screen." },
  { keys: ["rm -rf", "delete everything"], reply: "Alarmed quack. Do not run that blindly. Print the target, quote variables, use a dry run, and verify backups first." },
  { keys: ["friday", "deploy"], reply: "Friday deploys are survivable when the change is small, CI is green, rollback is tested, and someone is watching the metrics." },
  { keys: ["it works on my machine"], reply: "Then your machine is part of the specification. Capture it in a container image and prove the same artifact in CI." },
  { keys: ["cidr", "subnet"], reply: "AWS reserves 5 addresses per subnet. Usable hosts = 2^(32 - prefix) - 5. Smaller prefix numbers mean larger networks." },
  { keys: ["iam", "policy"], reply: "Evaluate IAM in this order: an explicit Deny wins, then look for a matching Allow, otherwise the request is denied implicitly." },
  { keys: ["crashloop", "oomkilled"], reply: "Start with kubectl describe pod and kubectl logs --previous. OOMKilled with exit 137 means the process crossed its memory limit." },
  { keys: ["readiness", "probe"], reply: "Readiness controls traffic, liveness controls restarts, and startup probes protect slow-starting applications from the other two." },
  { keys: ["security group", "firewall"], reply: "Security groups contain allow rules only. Match protocol, port range, and source. Anything unmatched is blocked by default." },
  { keys: ["docker", "container"], reply: "Use docker ps -a, then docker logs, then docker inspect. Observe before restarting so you do not erase the useful clue." },
  { keys: ["git"], reply: "git reflog recovers lost pointers, git revert is safe for shared history, and force-pushing main is a fast way to make new friends in incident response." },
];

export function localReply(text, screen) {
  const lower = text.toLowerCase();
  if (/explain (this|the) screen|what.*screen|what.*doing/.test(lower)) {
    return `${screen.title}: ${screen.summary}`;
  }
  if (/what.*learn|concept/.test(lower)) {
    return `This screen teaches ${screen.concepts.join(", ")}. Try to predict the result before pressing the action button.`;
  }
  if (/hint|stuck/.test(lower)) {
    return screen.hint ?? `Look at the goal, change one variable at a time, and observe which check changes. I will explain the mechanism without giving away the final answer.`;
  }
  const hit = answers.find((a) => a.keys.some((key) => lower.includes(key)));
  return hit?.reply ?? `Offline quack: I cannot reach Workers AI, but on ${screen.title} the key idea is: ${screen.summary}`;
}
