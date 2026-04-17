import { useEffect, useState } from "react";
import { Bracket } from "./components/Bracket";
import { Standings } from "./components/Standings";
import { fetchPlayoffCarousel } from "./lib/nhl";
import { seasonIdFromDate } from "./lib/season";
import { scorePool, type PoolPicksFile } from "./lib/scoring";
import picksFile from "./picks.json";
import "./App.css";

function usePlayoffData(expectedSeason: number) {
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [seasonId, setSeasonId] = useState(expectedSeason);
  const [normalized, setNormalized] = useState<
    Awaited<ReturnType<typeof fetchPlayoffCarousel>>["normalized"]
  >([]);

  const load = async () => {
    setStatus("loading");
    setError(null);
    try {
      const sid = expectedSeason;
      const { carousel, normalized: norm } = await fetchPlayoffCarousel(sid);
      setSeasonId(carousel.seasonId);
      setNormalized(norm);
      setUpdatedAt(new Date());
      setStatus("ok");
    } catch (e) {
      setStatus("err");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(id);
  }, [expectedSeason]);

  return { status, error, updatedAt, seasonId, normalized, reload: load };
}

export default function App() {
  const picks = picksFile as PoolPicksFile;
  const defaultSeason = seasonIdFromDate();
  const expectedSeason = picks.seasonId ?? defaultSeason;

  const { status, error, updatedAt, seasonId, normalized, reload } =
    usePlayoffData(expectedSeason);

  const scores =
    status === "ok" ? scorePool(picks, normalized) : null;

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow mono">Stanley Cup playoffs</p>
        <h1>Andrew vs Lincoln</h1>
        <p className="lede">
          Live bracket from the NHL, and{" "}
          <strong>$1 per series</strong> when your team wins the series.
        </p>
        <div className="hero-meta">
          <span className="mono">Season {seasonId}</span>
          {updatedAt && (
            <span className="muted">
              Updated {updatedAt.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button type="button" className="refresh mono" onClick={() => void reload()}>
            Refresh
          </button>
        </div>
        {picks.seasonId !== seasonId && status === "ok" && (
          <p className="warn banner">
            <strong>Note:</strong> <code className="mono">picks.json</code> is set to
            season <span className="mono">{picks.seasonId}</span> but the API
            returned <span className="mono">{seasonId}</span>. Update picks when
            the new playoff carousel is published.
          </p>
        )}
      </header>

      {status === "loading" && <p className="panel muted">Loading playoffs…</p>}
      {status === "err" && (
        <p className="panel danger" role="alert">
          Could not load playoff data: {error}
        </p>
      )}

      {scores && (
        <>
          <Standings andrew={scores.andrew} lincoln={scores.lincoln} />
          <Bracket series={normalized} picks={picks} />
        </>
      )}

      <footer className="footer muted">
        <p>
          Data from{" "}
          <a
            href="https://api-web.nhle.com/"
            target="_blank"
            rel="noreferrer"
          >
            api-web.nhle.com
          </a>
          . Not affiliated with the NHL. Deploy on{" "}
          <a href="https://www.netlify.com/" target="_blank" rel="noreferrer">
            Netlify
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
