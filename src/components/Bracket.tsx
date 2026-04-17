import type {
  NormalizedSeries,
  NormalizedTeam,
  SeriesCompletedGame,
} from "../lib/nhl";
import {
  isEasternRoundOne,
  isWesternRoundOne,
  isLiveScheduleGameState,
  isScoreboardLiveState,
  nhlSiteUrl,
  scheduleGameStateLabel,
} from "../lib/nhl";
import { useEffect, useState } from "react";
import type { PoolPicksFile } from "../lib/scoring";

const ACCORDION_ROUNDS = 4 as const;

const ROUND_SUBTITLE: Record<number, string> = {
  1: "First round",
  2: "Second round",
  3: "Conference finals",
  4: "Stanley Cup Final",
};

function clampAccordionRound(r: number): number {
  if (!Number.isFinite(r)) return 1;
  return Math.min(ACCORDION_ROUNDS, Math.max(1, Math.floor(r)));
}

type Props = {
  series: NormalizedSeries[];
  picks: PoolPicksFile;
  /** From NHL carousel `currentRound`; controls which accordion panel opens by default. */
  currentRound: number;
};

/** Prefer dark-mark SVGs on our dark UI; fall back to the “light” asset if needed. */
function teamLogoSrc(t: NormalizedTeam): string | undefined {
  return t.darkLogo?.trim() || t.logo?.trim() || undefined;
}

function TeamLogo({ team }: { team: NormalizedTeam }) {
  const src = teamLogoSrc(team);
  if (!src) return <span className="team-logo team-logo--empty" aria-hidden />;

  return (
    <span className="team-logo">
      <img
        src={src}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
        className="team-logo-img"
      />
    </span>
  );
}

function formatFinalScoreLine(g: SeriesCompletedGame): string {
  if (g.awayScore != null && g.homeScore != null) {
    return `${g.awayAbbrev} ${g.awayScore} @ ${g.homeAbbrev} ${g.homeScore}`;
  }
  return `${g.awayAbbrev} @ ${g.homeAbbrev}`;
}

function SeriesResultsDetails({ games }: { games: SeriesCompletedGame[] }) {
  if (games.length === 0) return null;

  return (
    <details className="series-results">
      <summary className="series-results-summary mono">
        Game results ({games.length} played)
      </summary>
      <ul className="series-results-list">
        {games.map((g) => (
          <li key={g.gameId} className="series-result-item">
            <span className="series-result-meta mono">Game {g.gameNumber}</span>
            <span className="series-result-score mono">{formatFinalScoreLine(g)}</span>
            {g.gameCenterUrl && (
              <a
                className="series-result-gc"
                href={g.gameCenterUrl}
                target="_blank"
                rel="noreferrer"
              >
                Box / GC
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function nextGameStartLabel(ng: {
  startTimeUTC: string;
  venueDefault?: string;
}): string {
  const when = new Date(ng.startTimeUTC).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return ng.venueDefault ? `${when} · ${ng.venueDefault}` : when;
}

function badgeForPick(
  s: NormalizedSeries,
  abbrev: string,
  pick: string | undefined,
): string {
  if (!pick) return "";
  if (pick !== abbrev) return "";
  if (s.winnerAbbrev === abbrev) return "pick hit";
  if (s.winnerAbbrev && s.winnerAbbrev !== abbrev) return "pick miss";
  return "pick open";
}

function SeriesCard({
  s,
  andrewPick,
  lincolnPick,
}: {
  s: NormalizedSeries;
  andrewPick?: string;
  lincolnPick?: string;
}) {
  const rows = [
    { team: s.top, seed: "top" as const },
    { team: s.bottom, seed: "bottom" as const },
  ];

  return (
    <article className="series-card">
      <header className="series-head">
        <span className="mono series-id">{s.id}</span>
        {s.winnerAbbrev ? (
          <span className="series-winner mono">Won: {s.winnerAbbrev}</span>
        ) : (
          <span className="series-live muted">In progress</span>
        )}
      </header>

      {(s.nextGame || s.seriesLink) && (
        <div className="series-next">
          {s.nextGame && (
            <>
              <p className="series-next-line">
                <span
                  className={`series-state mono ${isLiveScheduleGameState(s.nextGame.gameState) ? "is-live" : ""}`}
                >
                  {scheduleGameStateLabel(s.nextGame.gameState)}
                </span>
                <span className="muted"> · </span>
                <span className="mono">Game {s.nextGame.gameNumberOfSeries}</span>
                <span className="muted"> · </span>
                <span className="mono matchup">
                  {s.nextGame.awayAbbrev} @ {s.nextGame.homeAbbrev}
                </span>
              </p>

              {isScoreboardLiveState(s.nextGame.gameState) && (
                <div className="series-live-box">
                  {s.nextGame.awayScore != null &&
                  s.nextGame.homeScore != null ? (
                    <p className="series-live-score mono">
                      {s.nextGame.awayAbbrev} {s.nextGame.awayScore}{" "}
                      <span className="series-live-dash">—</span>{" "}
                      {s.nextGame.homeAbbrev} {s.nextGame.homeScore}
                    </p>
                  ) : (
                    <p className="series-live-score muted mono">Score…</p>
                  )}
                  {s.nextGame.livePeriodClock && (
                    <p className="series-live-clock mono">
                      {s.nextGame.livePeriodClock}
                    </p>
                  )}
                </div>
              )}

              {(s.nextGame.gameState === "FUT" ||
                s.nextGame.gameState === "PRE") && (
                <p className="series-next-when">
                  <span className="series-next-when-label">Starts</span>{" "}
                  <span className="mono">{nextGameStartLabel(s.nextGame)}</span>
                </p>
              )}

              {s.nextGame.gameState === "OFF" &&
                s.nextGame.awayScore != null &&
                s.nextGame.homeScore != null && (
                  <p className="series-next-final muted mono">
                    Final: {s.nextGame.awayAbbrev} {s.nextGame.awayScore} —{" "}
                    {s.nextGame.homeAbbrev} {s.nextGame.homeScore}
                  </p>
                )}
            </>
          )}

          <div className="series-links">
            {s.nextGame?.gameCenterUrl && (
              <a
                className="series-link series-link--primary"
                href={s.nextGame.gameCenterUrl}
                target="_blank"
                rel="noreferrer"
              >
                {isLiveScheduleGameState(s.nextGame.gameState)
                  ? "Game Center (live)"
                  : "Game Center"}
              </a>
            )}
            {s.seriesLink && (
              <a
                className="series-link"
                href={nhlSiteUrl(s.seriesLink)}
                target="_blank"
                rel="noreferrer"
              >
                Series on NHL.com
              </a>
            )}
          </div>
        </div>
      )}

      <div className="series-teams">
        {rows.map((r) => {
          const abbr = r.team.abbrev;
          return (
            <div
              key={r.seed}
              className={`team-row ${s.winnerAbbrev === abbr ? "clinched" : ""}`}
            >
              <div className="team-main">
                <TeamLogo team={r.team} />
                <span className="team-abbr mono">{abbr}</span>
              </div>
              <span className="team-wins mono">{r.team.wins}</span>
              <span className="pick-badges">
                {andrewPick === abbr && (
                  <span className={`badge andrew ${badgeForPick(s, abbr, andrewPick)}`}>
                    Andrew
                  </span>
                )}
                {lincolnPick === abbr && (
                  <span
                    className={`badge lincoln ${badgeForPick(s, abbr, lincolnPick)}`}
                  >
                    Lincoln
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {s.completedGames && s.completedGames.length > 0 && (
        <SeriesResultsDetails games={s.completedGames} />
      )}

      <footer className="series-foot muted">
        First to {s.neededToWin} wins
      </footer>
    </article>
  );
}

function RoundSubBlock({
  title,
  items,
  picks,
}: {
  title: string;
  items: NormalizedSeries[];
  picks: PoolPicksFile;
}) {
  if (items.length === 0) return null;
  return (
    <div className="round-sub-block">
      <h4 className="round-sub-title">{title}</h4>
      <div className="series-grid">
        {items.map((s) => (
          <SeriesCard
            key={s.id}
            s={s}
            andrewPick={picks.andrew[s.id]}
            lincolnPick={picks.lincoln[s.id]}
          />
        ))}
      </div>
    </div>
  );
}

export function Bracket({ series, picks, currentRound }: Props) {
  const byRound = new Map<number, NormalizedSeries[]>();
  for (const s of series) {
    const list = byRound.get(s.roundNumber) ?? [];
    list.push(s);
    byRound.set(s.roundNumber, list);
  }

  const r1 = series.filter((s) => s.roundNumber === 1);
  const east1 = r1
    .filter(isEasternRoundOne)
    .sort((a, b) => a.seriesLetter.localeCompare(b.seriesLetter));
  const west1 = r1
    .filter(isWesternRoundOne)
    .sort((a, b) => a.seriesLetter.localeCompare(b.seriesLetter));
  const r1Other = r1
    .filter((s) => !isEasternRoundOne(s) && !isWesternRoundOne(s))
    .sort((a, b) => a.seriesLetter.localeCompare(b.seriesLetter));

  const apiRound = clampAccordionRound(currentRound);
  const [openRound, setOpenRound] = useState<number | null>(apiRound);

  useEffect(() => {
    setOpenRound(clampAccordionRound(currentRound));
  }, [currentRound]);

  function renderRoundPanel(rn: number) {
    if (rn === 1) {
      const hasR1 =
        east1.length > 0 || west1.length > 0 || r1Other.length > 0;
      if (!hasR1) {
        return (
          <p className="round-accordion-empty muted">
            No series in this round yet.
          </p>
        );
      }
      return (
        <div className="round-accordion-panel-inner">
          {(east1.length > 0 || west1.length > 0) && (
            <div className="r1-split">
              <RoundSubBlock
                title="East — first round (A–D)"
                items={east1}
                picks={picks}
              />
              <RoundSubBlock
                title="West — first round (E–H)"
                items={west1}
                picks={picks}
              />
            </div>
          )}
          <RoundSubBlock
            title="First round (other)"
            items={r1Other}
            picks={picks}
          />
        </div>
      );
    }

    const items = (byRound.get(rn) ?? []).sort((a, b) =>
      a.seriesLetter.localeCompare(b.seriesLetter),
    );
    if (items.length === 0) {
      return (
        <p className="round-accordion-empty muted">
          No series in this round yet.
        </p>
      );
    }
    return (
      <div className="series-grid">
        {items.map((s) => (
          <SeriesCard
            key={s.id}
            s={s}
            andrewPick={picks.andrew[s.id]}
            lincolnPick={picks.lincoln[s.id]}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="bracket" aria-labelledby="bracket-heading">
      <h2 id="bracket-heading">Playoff bracket</h2>
      <p className="bracket-sub muted">
        Rounds 1–4 in expandable sections. The NHL’s current playoff round
        opens automatically; earlier rounds stay available below.
      </p>

      <div className="bracket-accordions">
        {Array.from({ length: ACCORDION_ROUNDS }, (_, i) => i + 1).map(
          (rn) => {
            const isOpen = openRound === rn;
            const panelId = `bracket-round-${rn}-panel`;
            const btnId = `bracket-round-${rn}-btn`;
            return (
              <div key={rn} className="bracket-accordion-item">
                <button
                  type="button"
                  id={btnId}
                  className={`bracket-accordion-trigger ${isOpen ? "is-open" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenRound((prev) => (prev === rn ? null : rn))
                  }
                >
                  <span className="bracket-accordion-trigger-main mono">
                    Round {rn}
                  </span>
                  <span className="bracket-accordion-trigger-sub muted">
                    {ROUND_SUBTITLE[rn] ?? ""}
                  </span>
                  <span className="bracket-accordion-chevron" aria-hidden>
                    {isOpen ? "\u25BE" : "\u25B8"}
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className="bracket-accordion-panel"
                  >
                    {renderRoundPanel(rn)}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}
