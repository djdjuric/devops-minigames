import { useEffect, useState } from "react";
import { games } from "./games/index.js";
import { emptyProfile, rankFor, starsFor } from "./lib/profile.js";
import { loadProfile, PROFILE_STORAGE_KEY, recordResult, saveProfile } from "./lib/store.js";
import Achievements from "./components/Achievements.jsx";
import Chat from "./components/Chat.jsx";
import Hud from "./components/Hud.jsx";
import Guide from "./components/Guide.jsx";
import Result from "./components/Result.jsx";
import Stars from "./components/Stars.jsx";
import { useDuckScreen } from "./components/DuckContext.jsx";

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, "");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo?.(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Home({ profile }) {
  useDuckScreen({
    id: "home",
    title: "CloudOps mission board",
    summary: "Choose a cloud operations mission, earn XP, unlock trophies, and improve your rank. AWS concepts appear where they fit the lesson, without pretending this is a real cloud console.",
    concepts: ["XP and ranks", "mission stars", "official documentation"],
    hint: "Start with a simulation marked New, or replay a mission with fewer stars.",
  });
  const rank = rankFor(profile.xp);
  const recommended = [...games].sort((a, b) => (profile.games[a.id]?.plays ?? 0) - (profile.games[b.id]?.plays ?? 0))[0];
  const firstTime = profile.runs === 0;

  return (
    <>
      <section className="hero card">
        <div>
          <h2>{firstTime ? "Cloud operations training ground" : `Back on shift, ${rank.name}`}</h2>
          <p>
            {rank.next
              ? `${rank.toNext} XP until you are promoted to ${rank.next.name}.`
              : "You reached the top rank. Chase perfect scores."}
          </p>
        </div>
        <a className="btn primary" href={`#/${recommended.id}`}>
          {firstTime ? "Launch first mission:" : "Recommended:"} {recommended.title}
        </a>
      </section>
      <h2 className="section-title">Mission board</h2>
      <div className="grid">
        {games.map((game) => {
          const stats = profile.games[game.id];
          return (
            <a key={game.id} className="card game-card" href={`#/${game.id}`}>
              <div className="row between">
                <span className="badge">{game.badge}</span>
                {stats ? <Stars count={starsFor(stats.bestPct)} /> : <span className="tag new">New</span>}
              </div>
              <span className="cloud-context">{game.context}</span>
              <h2>{game.title}</h2>
              <p>{game.blurb}</p>
              <div className="tags">
                {game.topics.map((topic) => (
                  <span className="tag" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
              <span className="best">{stats ? `Best ${stats.best} pts · played ${stats.plays}x` : "Not played yet"}</span>
            </a>
          );
        })}
      </div>
    </>
  );
}

function GameScreen({ game, profile, onResult }) {
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);
  const [finished, setFinished] = useState(null);
  const stats = profile.games[game.id];
  const phase = finished ? "debrief" : started ? "mission" : "briefing";
  useDuckScreen({
    id: `${game.id}-${phase}`,
    title: `${game.title} · ${phase}`,
    summary: finished
      ? `The mission is complete. Review the score, XP, stars, and any trophies before replaying or choosing another mission.`
      : started
        ? game.duck ?? `${game.blurb} Follow the mission goal, observe the feedback, and change one thing at a time.`
        : `${game.blurb} This briefing explains the controls and scoring before the mission starts.`,
    concepts: game.topics,
    hint: started ? "Read the goal and current evidence first. Change one variable at a time and observe the result." : "Read How to play, then start the mission when the controls make sense.",
  });

  function finish(score, max) {
    setFinished({ score, max, outcome: onResult({ gameId: game.id, score, max }) });
  }

  function replay() {
    setFinished(null);
    setRun(run + 1);
  }

  return (
    <>
      <a className="back" href="#/">
        All games
      </a>
      <h2 className="game-title">{game.title}</h2>
      {!started ? (
        <div className="card intro">
          <span className="cloud-context">{game.context}</span>
          <p className="lead">{game.blurb}</p>
          <h3>How to play</h3>
          <ul>
            {game.howTo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="tags">
            {game.topics.map((topic) => (
              <span className="tag" key={topic}>
                {topic}
              </span>
            ))}
          </div>
          <div className="row between">
            <span className="muted">{stats ? `Best ${stats.best} pts` : "First time here"}</span>
            <button className="btn primary" onClick={() => setStarted(true)} autoFocus>
              Start mission
            </button>
          </div>
        </div>
      ) : finished ? (
        <Result {...finished} onReplay={replay} onHome={() => (window.location.hash = "#/")} />
      ) : (
        <game.Component key={run} onFinish={finish} />
      )}
    </>
  );
}

export default function App() {
  const route = useHashRoute();
  const [profile, setProfile] = useState(loadProfile);
  const game = games.find((g) => g.id === route);

  useEffect(() => {
    const syncProgress = (event) => {
      if (event.key === PROFILE_STORAGE_KEY) setProfile(loadProfile());
    };
    window.addEventListener("storage", syncProgress);
    return () => window.removeEventListener("storage", syncProgress);
  }, []);

  function handleResult(result) {
    const outcome = recordResult(result, games.length);
    setProfile(outcome.profile);
    return outcome;
  }

  function replaceProfile(restored) {
    const saved = saveProfile(restored);
    setProfile(saved);
  }

  function reset() {
    replaceProfile(emptyProfile());
  }

  return (
    <div className="app">
      <header>
        <a href="#/" className="logo">
          CloudOps Arcade
        </a>
        <Hud profile={profile} />
      </header>
      <main>
        {route === "guide" ? (
          <Guide />
        ) : route === "achievements" ? (
          <Achievements profile={profile} onReset={reset} onImport={replaceProfile} />
        ) : game ? (
          <GameScreen key={game.id} game={game} profile={profile} onResult={handleResult} />
        ) : (
          <Home profile={profile} />
        )}
      </main>
      <footer>Independent learning game. AWS concepts and names belong to Amazon Web Services; lessons link to official documentation.</footer>
      <Chat />
    </div>
  );
}
