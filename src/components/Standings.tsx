import type { PlayerScore } from "../lib/scoring";

type Props = {
  andrew: PlayerScore;
  lincoln: PlayerScore;
};

export function Standings({ andrew, lincoln }: Props) {
  const rows = [andrew, lincoln].sort((a, b) => {
    if (b.currentDollars !== a.currentDollars) {
      return b.currentDollars - a.currentDollars;
    }
    return b.confirmedDollars - a.confirmedDollars;
  });

  return (
    <section className="standings" aria-labelledby="standings-heading">
      <h2 id="standings-heading">Pool standings</h2>
      <p className="standings-sub">
        <strong>Current</strong> counts confirmed wins plus $1 for each ongoing
        series where your pick leads in games. <strong>Confirmed</strong> is
        money from finished series only. <strong>Up to</strong> is the ceiling if
        every alive pick wins.
      </p>
      <div className="standings-grid">
        {rows.map((p) => (
          <article key={p.name} className="standings-card">
            <h3>{p.name}</h3>
            <div className="standings-numbers">
              <div>
                <span className="label">Current</span>
                <span className="value value--current mono">${p.currentDollars}</span>
              </div>
              <div>
                <span className="label">Confirmed</span>
                <span className="value mono">${p.confirmedDollars}</span>
              </div>
              <div>
                <span className="label">Up to</span>
                <span className="value dim mono">${p.potentialMaxDollars}</span>
              </div>
            </div>
            <dl className="standings-detail">
              <div>
                <dt>Series correct</dt>
                <dd className="mono">{p.correctSeriesIds.length}</dd>
              </div>
              <div>
                <dt>Still alive</dt>
                <dd className="mono">{p.pendingSeriesIds.length}</dd>
              </div>
              <div>
                <dt>Lost pick</dt>
                <dd className="mono">{p.wrongSeriesIds.length}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
