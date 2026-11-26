const playedCount = (p) => Object.values(p.games).filter((g) => g.plays > 0).length;

export const achievements = [
  { id: "first-run", name: "First Deploy", desc: "Finish any game.", check: (p) => p.runs >= 1 },
  { id: "perfect", name: "Zero Downtime", desc: "Score 100% in any game.", check: (p, c) => c.pct === 100 },
  { id: "triple", name: "Triple Threat", desc: "Play 3 different games.", check: (p) => playedCount(p) >= 3 },
  { id: "full-stack", name: "Full Stack", desc: "Play every game at least once.", check: (p, c) => playedCount(p) >= c.totalGames },
  { id: "grinder", name: "Persistent", desc: "Finish 10 runs.", check: (p) => p.runs >= 10 },
  { id: "streak-3", name: "On Call", desc: "Play 3 days in a row.", check: (p) => p.streak >= 3 },
  { id: "streak-7", name: "Pager Veteran", desc: "Play 7 days in a row.", check: (p) => p.streak >= 7 },
  { id: "xp-500", name: "Rising Star", desc: "Earn 500 XP.", check: (p) => p.xp >= 500 },
  { id: "xp-2000", name: "Battle Scarred", desc: "Earn 2000 XP.", check: (p) => p.xp >= 2000 },
  { id: "shell-wizard", name: "Shell Wizard", desc: "Score 80% or more in Shell Lab.", check: (p, c) => c.gameId === "shell" && c.pct >= 80 },
  { id: "firewall", name: "Firewall Whisperer", desc: "Score 90% or more in Security Group Defender.", check: (p, c) => c.gameId === "sg" && c.pct >= 90 },
  { id: "least-privilege", name: "Least Privilege", desc: "Get a perfect IAM Policy Debugger run.", check: (p, c) => c.gameId === "iam" && c.pct === 100 },
  { id: "quick-draw", name: "Quick Draw", desc: "Score 85% or more in Quiz Blitz.", check: (p, c) => c.gameId === "quiz" && c.pct >= 85 },
];

export const ACHIEVEMENT_BONUS_XP = 50;
