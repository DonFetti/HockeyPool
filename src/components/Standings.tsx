import type { PlayerScore } from "../lib/scoring";

type Props = {
  andrew: PlayerScore;
  lincoln: PlayerScore;
};

export function Standings({ andrew, lincoln }: Props) {
  const rows = [andrew, lincoln].sort((a, b) => b.earnedDollars - a.earnedDollars);

  return (
    <section className="standings" aria-labelledby="standings-heading">
      <h2 id="standings-heading">Pool standings</h2>
      <p className="standings-sub">
        $1 per series when your pick wins the series. “Banked” is clinched;
        “Up to” includes series still in play where your pick could still win.
      </p>
      <div className="standings-grid">
        {rows.map((p) => (
          <article key={p.name} className="standings-card">
            <h3>{p.name}</h3>
            <div className="standings-numbers">
              <div>
                <span className="label">Banked</span>
                <span className="value mono">${p.earnedDollars}</span>
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
