import { useState } from "react";
import { achievements } from "../data/achievements.js";
import { exportProfile, importProfile } from "../lib/store.js";
import { useDuckScreen } from "./DuckContext.jsx";

export default function Achievements({ profile, onReset, onImport }) {
  const [message, setMessage] = useState("");
  useDuckScreen({
    id: "achievements",
    title: "Trophy cabinet and progress backup",
    summary: "This page shows long-term milestones. Progress saves automatically in this browser, and the backup controls let you move it to another device.",
    concepts: ["persistent progress", "learning milestones", "XP bonuses", "backup and restore"],
    hint: "Play different missions and improve your scores. Each new trophy grants 50 XP.",
  });
  const unlocked = Object.keys(profile.achievements).length;

  function download() {
    const blob = new Blob([exportProfile(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devops-minigames-progress-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Progress backup downloaded.");
  }

  async function restore(event) {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;
    try {
      const restored = importProfile(await file.text());
      if (!window.confirm("Replace progress in this browser with this backup?")) return;
      onImport(restored);
      setMessage("Progress restored and saved.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <a className="back" href="#/">
        All games
      </a>
      <h2 className="game-title">
        Trophies <span className="muted">{unlocked} / {achievements.length}</span>
      </h2>
      <section className="card backup-card">
        <div>
          <h3>Progress is saved</h3>
          <p>XP, ranks, stars, scores, streaks, and trophies are stored automatically in this browser.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={download}>Download backup</button>
          <label className="btn file-button">
            Restore backup
            <input type="file" accept="application/json,.json" onChange={restore} />
          </label>
        </div>
        {message && <p className="save-message" role="status">{message}</p>}
      </section>
      <div className="trophy-grid">
        {achievements.map((achievement) => {
          const date = profile.achievements[achievement.id];
          return (
            <div key={achievement.id} className={`trophy ${date ? "on" : ""}`}>
              <span className="trophy-icon" aria-hidden="true" />
              <div>
                <strong>{achievement.name}</strong>
                <p>{achievement.desc}</p>
                <small>{date ? `Unlocked ${date}` : "Locked"}</small>
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="btn small reset"
        onClick={() => window.confirm("Erase all progress stored in this browser?") && onReset()}
      >
        Reset progress
      </button>
    </>
  );
}
