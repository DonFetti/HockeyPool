import type { NormalizedSeries } from "../lib/nhl";
import {
  isEasternRoundOne,
  isWesternRoundOne,
} from "../lib/nhl";
import type { PoolPicksFile } from "../lib/scoring";

type Props = {
  series: NormalizedSeries[];
  picks: PoolPicksFile;
};

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
    { label: s.top.abbrev, wins: s.top.wins, seed: "top" as const },
    { label: s.bottom.abbrev, wins: s.bottom.wins, seed: "bottom" as const },
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
      <div className="series-teams">
        {rows.map((r) => (
          <div
            key={r.seed}
            className={`team-row ${s.winnerAbbrev === r.label ? "clinched" : ""}`}
          >
            <span className="team-abbr mono">{r.label}</span>
            <span className="team-wins mono">{r.wins}</span>
            <span className="pick-badges">
              {andrewPick === r.label && (
                <span className={`badge andrew ${badgeForPick(s, r.label, andrewPick)}`}>
                  Andrew
                </span>
              )}
              {lincolnPick === r.label && (
                <span
                  className={`badge lincoln ${badgeForPick(s, r.label, lincolnPick)}`}
                >
                  Lincoln
                </span>
              )}
            </span>
          </div>
        ))}
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
