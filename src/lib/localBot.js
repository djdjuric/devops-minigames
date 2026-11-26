const answers = [
  { keys: ["hello", "hi", "hey"], reply: "Hello. Ask me about AWS, Kubernetes, Linux or Git, or ask me something silly." },
  { keys: ["rm -rf", "delete everything"], reply: "Please do not. Run it with a dry run first, quote your variables, and keep backups." },
  { keys: ["friday", "deploy"], reply: "Deploying on a Friday is a lifestyle choice. Feature flags and quick rollbacks make it survivable." },
  { keys: ["it works on my machine"], reply: "Then we ship your machine. Or build a container image and prove it in CI." },
  { keys: ["cidr", "subnet"], reply: "AWS reserves 5 addresses per subnet. Usable hosts = 2^(32 - prefix) - 5. Try the Subnet Sizer game." },
  { keys: ["iam", "policy"], reply: "Remember the order: explicit Deny wins, then an explicit Allow, otherwise the default is deny." },
  { keys: ["crashloop", "oomkilled"], reply: "Run kubectl describe pod and kubectl logs --previous. Exit code 137 usually means OOMKilled." },
  { keys: ["git"], reply: "git reflog saves lives, git revert is safe on shared branches, and never force-push to main." },
];

export function localReply(text) {
  const lower = text.toLowerCase();
  const hit = answers.find((a) => a.keys.some((k) => lower.includes(k)));
  return (
    hit?.reply ??
    "The AI helper is offline right now, so I only know a few tricks. Try asking about IAM, CIDR, Kubernetes, Git or deploying on Fridays."
  );
}
