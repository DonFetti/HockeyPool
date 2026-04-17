import type { NormalizedSeries, NormalizedTeam } from "../lib/nhl";
import {
  isEasternRoundOne,
  isWesternRoundOne,
  isLiveScheduleGameState,
  nhlSiteUrl,
  scheduleGameStateLabel,
} from "../lib/nhl";
import type { PoolPicksFile } from "../lib/scoring";

type Props = {
  series: NormalizedSeries[];
  picks: PoolPicksFile;
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
          )}
          {s.nextGame && (
            <p className="series-next-when muted">
              {new Date(s.nextGame.startTimeUTC).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
              {s.nextGame.venueDefault ? ` · ${s.nextGame.venueDefault}` : ""}
            </p>
          )}
          <div className="series-links">
            {s.nextGame && (
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
      <footer className="series-foot muted">
        First to {s.neededToWin} wins
      </footer>
    </article>
  );
}

function RoundBlock({
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
    <div className="round-block">
      <h3 className="round-title">{title}</h3>
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

export function Bracket({ series, picks }: Props) {
  const byRound = new Map<number, NormalizedSeries[]>();
  for (const s of series) {
    const list = byRound.get(s.roundNumber) ?? [];
    list.push(s);
    byRound.set(s.roundNumber, list);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);

  const r1 = series.filter((s) => s.roundNumber === 1);
  const east1 = r1.filter(isEasternRoundOne).sort((a, b) => a.seriesLetter.localeCompare(b.seriesLetter));
  const west1 = r1.filter(isWesternRoundOne).sort((a, b) => a.seriesLetter.localeCompare(b.seriesLetter));
  const r1Other = r1
    .filter((s) => !isEasternRoundOne(s) && !isWesternRoundOne(s))
    .sort((a, b) => a.seriesLetter.localeCompare(b.seriesLetter));

  return (
    <section className="bracket" aria-labelledby="bracket-heading">
      <h2 id="bracket-heading">Playoff bracket</h2>
      <p className="bracket-sub muted">
        First round is split East (A–D) and West (E–H). Later rounds follow the
        API order.
      </p>

      {rounds.includes(1) && (
        <>
          <div className="r1-split">
            <RoundBlock title="East — first round" items={east1} picks={picks} />
            <RoundBlock title="West — first round" items={west1} picks={picks} />
          </div>
          <RoundBlock title="First round (other)" items={r1Other} picks={picks} />
        </>
      )}

      {rounds
        .filter((r) => r !== 1)
        .map((rn) => (
          <RoundBlock
            key={rn}
            title={`Round ${rn}`}
            items={(byRound.get(rn) ?? []).sort((a, b) =>
              a.seriesLetter.localeCompare(b.seriesLetter),
            )}
            picks={picks}
          />
        ))}
    </section>
  );
}
