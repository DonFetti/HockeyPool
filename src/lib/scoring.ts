import type { NormalizedSeries } from "./nhl";

export type PoolPicksFile = {
  /** Should match carousel seasonId when playoffs are for that year */
  seasonId: number;
  /** Series id (e.g. R1-A) -> team abbrev picked to win the series */
  andrew: Record<string, string>;
  lincoln: Record<string, string>;
};

export type PlayerScore = {
  name: string;
  /** $1 per series clinched with a correct pick. */
  confirmedDollars: number;
  /**
   * Confirmed + $1 per ongoing series where your pick is ahead in wins
   * (snapshot “if things stopped now” for incomplete matchups).
   */
  currentDollars: number;
  potentialMaxDollars: number;
  correctSeriesIds: string[];
  pendingSeriesIds: string[];
  wrongSeriesIds: string[];
};

function pickResult(
  series: NormalizedSeries,
  pick: string | undefined,
): "correct" | "wrong" | "pending" | "none" {
  if (!pick) return "none";
  const w = series.winnerAbbrev;
  if (w) return pick === w ? "correct" : "wrong";
  const alive =
    series.top.abbrev === pick || series.bottom.abbrev === pick;
  if (!alive) return "wrong";
  const oppWins =
    pick === series.top.abbrev ? series.bottom.wins : series.top.wins;
  if (oppWins >= series.neededToWin) return "wrong";
  return "pending";
}

function isPickLeadingIncompleteSeries(
  series: NormalizedSeries,
  pick: string | undefined,
): boolean {
  if (!pick) return false;
  const p = pick.toUpperCase();
  if (series.winnerAbbrev) return false;
  if (p !== series.top.abbrev && p !== series.bottom.abbrev) return false;
  const tw = series.top.wins;
  const bw = series.bottom.wins;
  if (tw === bw) return false;
  if (p === series.top.abbrev) return tw > bw;
  return bw > tw;
}

export function scorePlayer(
  name: string,
  picks: Record<string, string>,
  allSeries: NormalizedSeries[],
): PlayerScore {
  const correctSeriesIds: string[] = [];
  const pendingSeriesIds: string[] = [];
  const wrongSeriesIds: string[] = [];

  for (const s of allSeries) {
    const pick = picks[s.id]?.toUpperCase();
    const r = pickResult(s, pick);
    if (r === "correct") correctSeriesIds.push(s.id);
    else if (r === "pending") pendingSeriesIds.push(s.id);
    else if (r === "wrong") wrongSeriesIds.push(s.id);
  }

  const confirmedDollars = correctSeriesIds.length;
  let leadingIncomplete = 0;
  for (const s of allSeries) {
    const pick = picks[s.id]?.toUpperCase();
    if (
      pickResult(s, pick) === "pending" &&
      isPickLeadingIncompleteSeries(s, pick)
    ) {
      leadingIncomplete += 1;
    }
  }

  return {
    name,
    confirmedDollars,
    currentDollars: confirmedDollars + leadingIncomplete,
    potentialMaxDollars: correctSeriesIds.length + pendingSeriesIds.length,
    correctSeriesIds,
    pendingSeriesIds,
    wrongSeriesIds,
  };
}

export function scorePool(
  picks: PoolPicksFile,
  allSeries: NormalizedSeries[],
): { andrew: PlayerScore; lincoln: PlayerScore } {
  return {
    andrew: scorePlayer("Andrew", picks.andrew, allSeries),
    lincoln: scorePlayer("Lincoln", picks.lincoln, allSeries),
  };
}
