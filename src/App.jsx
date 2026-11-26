import { useEffect, useState } from "react";
import { games } from "./games/index.js";
import { getBest, recordScore } from "./lib/store.js";
import Chat from "./components/Chat.jsx";
import Result from "./components/Result.jsx";

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, "");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Home() {
  return (
    <>
      <p className="lead">
        Short games that teach real AWS, Kubernetes, Linux, Git and IaC concepts. Everything links back to the official docs.
      </p>
      <div className="grid">
        {games.map((game) => (
          <a key={game.id} className="card game-card" href={`#/${game.id}`}>
            <span className="badge">{game.badge}</span>
            <h2>{game.title}</h2>
            <p>{game.blurb}</p>
            <div className="tags">
              {game.topics.map((topic) => (
                <span className="tag" key={topic}>
                  {topic}
                </span>
              ))}
            </div>
            <span className="best">Best: {getBest(game.id)}</span>
          </a>
        ))}
      </div>
    </>
  );
}

function GameScreen({ game }) {
  const [run, setRun] = useState(0);
  const [result, setResult] = useState(null);

  function finish(score, max) {
    const { best, isNewBest } = recordScore(game.id, score);
    setResult({ score, max, best, isNewBest });
  }

  function replay() {
    setResult(null);
    setRun(run + 1);
  }

  return (
    <>
      <a className="back" href="#/">
        All games
      </a>
      <h2 className="game-title">{game.title}</h2>
      {result ? (
        <Result {...result} onReplay={replay} onHome={() => (window.location.hash = "#/")} />
      ) : (
        <game.Component key={run} onFinish={finish} />
      )}
    </>
  );
}

export default function App() {
  const route = useHashRoute();
  const game = games.find((g) => g.id === route);

  return (
    <div className="app">
      <header>
        <a href="#/" className="logo">
          DevOps Minigames
        </a>
      </header>
      <main>{game ? <GameScreen key={game.id} game={game} /> : <Home />}</main>
      <footer>Open source. Questions are based on official AWS, Kubernetes, Git and Linux documentation.</footer>
      <Chat />
    </div>
  );
}
