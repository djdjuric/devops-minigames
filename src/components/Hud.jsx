import { achievements } from "../data/achievements.js";
import { rankFor } from "../lib/profile.js";

export default function Hud({ profile }) {
  const rank = rankFor(profile.xp);
  const unlocked = Object.keys(profile.achievements).length;
  return (
    <div className="hud">
      <div className="hud-rank" title={rank.next ? `${rank.toNext} XP to ${rank.next.name}` : "Max rank"}>
        <span className="hud-rank-name">{rank.name}</span>
        <span className="xpbar" aria-hidden="true">
          <span style={{ width: `${Math.round(rank.progress * 100)}%` }} />
        </span>
        <span className="hud-xp">{profile.xp} XP</span>
      </div>
      <span className="hud-chip" title="Days in a row">
        Streak {profile.streak}
      </span>
      <a className="hud-chip link" href="#/guide">
        How it works
      </a>
      <a className="hud-chip link" href="#/achievements">
        Trophies {unlocked}/{achievements.length}
      </a>
    </div>
  );
}
