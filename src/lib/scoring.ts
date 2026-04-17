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
  earnedDollars: number;
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

  return {
    name,
    earnedDollars: correctSeriesIds.length,
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
