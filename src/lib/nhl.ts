import { seasonIdFromDate } from "./season";

const API_PREFIX = "/api/nhl";

export type CarouselSeed = {
  id: number;
  abbrev: string;
  wins: number;
  logo?: string;
  darkLogo?: string;
};

export type CarouselSeries = {
  seriesLetter: string;
  roundNumber: number;
  seriesLabel: string;
  seriesLink?: string;
  topSeed: CarouselSeed;
  bottomSeed: CarouselSeed;
  neededToWin: number;
};

export type PlayoffCarousel = {
  seasonId: number;
  currentRound: number;
  rounds: Array<{
    roundNumber: number;
    roundLabel: string;
    roundAbbrev: string;
    series: CarouselSeries[];
  }>;
};

export type NormalizedTeam = {
  abbrev: string;
  wins: number;
  /** Primary mark from the API (often *_light.svg — works on dark backgrounds). */
  logo?: string;
  /** Alternate mark from the API (often *_dark.svg). */
  darkLogo?: string;
};

export type NextGameInfo = {
  gameId: number;
  startTimeUTC: string;
  gameState: string;
  gameNumberOfSeries: number;
  awayAbbrev: string;
  homeAbbrev: string;
  venueDefault?: string;
  /** Absolute https://www.nhl.com/gamecenter/... */
  gameCenterUrl: string;
};

export type NormalizedSeries = {
  id: string;
  roundNumber: number;
  roundAbbrev: string;
  seriesLetter: string;
  top: NormalizedTeam;
  bottom: NormalizedTeam;
  neededToWin: number;
  winnerAbbrev: string | null;
  /** Path from carousel, e.g. `/schedule/playoff-series/2026/series-a/...` */
  seriesLink?: string;
  /** Merged from `/v1/schedule/now` — live game, next upcoming, or last game if series finished. */
  nextGame?: NextGameInfo | null;
  /** Finished games only (typically game 1–7), from `/v1/schedule/now`. */
  completedGames?: SeriesCompletedGame[];
};

export type ScheduleTeamSide = {
  abbrev: string;
  /** Present on some responses when the game is final or in progress. */
  score?: number;
};

export type ScheduleGame = {
  id: number;
  gameType?: number;
  startTimeUTC: string;
  gameState: string;
  venue?: { default: string };
  awayTeam: ScheduleTeamSide;
  homeTeam: ScheduleTeamSide;
  gameCenterLink?: string;
  seriesUrl?: string;
  /** Some schedule payloads nest scores here instead of on teams. */
  score?: { away?: number; home?: number };
  seriesStatus?: {
    round: number;
    seriesAbbrev: string;
    seriesLetter: string;
    gameNumberOfSeries: number;
  };
};

export type SeriesCompletedGame = {
  gameNumber: number;
  gameId: number;
  awayAbbrev: string;
  homeAbbrev: string;
  awayScore: number | null;
  homeScore: number | null;
  gameCenterUrl?: string;
};

export type ScheduleNowResponse = {
  gameWeek: Array<{ date: string; games: ScheduleGame[] }>;
};

export function nhlSiteUrl(pathOrUrl: string): string {
  const t = pathOrUrl.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const p = t.startsWith("/") ? t : `/${t}`;
  return `https://www.nhl.com${p}`;
}

const LIVE_GAME_STATES = new Set(["LIVE", "CRIT", "INT", "PRE"]);

export function scheduleGameStateLabel(state: string): string {
  if (LIVE_GAME_STATES.has(state)) return "Live";
  if (state === "FUT") return "Upcoming";
  if (state === "OFF") return "Final";
  return state;
}

export function isLiveScheduleGameState(state: string): boolean {
  return LIVE_GAME_STATES.has(state);
}

const COMPLETED_GAME_STATES = new Set(["OFF", "FINAL"]);

export function isCompletedScheduleGameState(state: string): boolean {
  return COMPLETED_GAME_STATES.has(state);
}

function readScheduleGameScores(g: ScheduleGame): { away: number; home: number } | null {
  const a = g.awayTeam?.score;
  const h = g.homeTeam?.score;
  if (typeof a === "number" && typeof h === "number") return { away: a, home: h };
  const s = g.score;
  if (
    s &&
    typeof s.away === "number" &&
    typeof s.home === "number"
  ) {
    return { away: s.away, home: s.home };
  }
  return null;
}

export function buildCompletedGamesList(
  games: ScheduleGame[],
): SeriesCompletedGame[] {
  const rows: SeriesCompletedGame[] = [];
  for (const g of games) {
    if (!g.seriesStatus || !isCompletedScheduleGameState(g.gameState)) continue;
    const sc = readScheduleGameScores(g);
    rows.push({
      gameNumber: g.seriesStatus.gameNumberOfSeries,
      gameId: g.id,
      awayAbbrev: g.awayTeam.abbrev,
      homeAbbrev: g.homeTeam.abbrev,
      awayScore: sc?.away ?? null,
      homeScore: sc?.home ?? null,
      gameCenterUrl: g.gameCenterLink?.trim()
        ? nhlSiteUrl(g.gameCenterLink.trim())
        : undefined,
    });
  }
  rows.sort((a, b) => a.gameNumber - b.gameNumber);
  const byNumber = new Map<number, SeriesCompletedGame>();
  for (const r of rows) {
    byNumber.set(r.gameNumber, r);
  }
  return [...byNumber.values()].sort((a, b) => a.gameNumber - b.gameNumber);
}

function scheduleSeriesKey(status: NonNullable<ScheduleGame["seriesStatus"]>): string {
  return `${status.seriesAbbrev}-${status.seriesLetter}`;
}

export function indexPlayoffGamesBySeries(
  schedule: ScheduleNowResponse,
): Map<string, ScheduleGame[]> {
  const map = new Map<string, ScheduleGame[]>();
  const seenIds = new Set<number>();

  for (const day of schedule.gameWeek) {
    for (const g of day.games) {
      if (!g.seriesStatus || seenIds.has(g.id)) continue;
      seenIds.add(g.id);
      const k = scheduleSeriesKey(g.seriesStatus);
      const list = map.get(k) ?? [];
      list.push(g);
      map.set(k, list);
    }
  }

  for (const [, list] of map) {
    list.sort((a, b) => a.startTimeUTC.localeCompare(b.startTimeUTC));
  }
  return map;
}

/** Prefer an in-progress game, else the next scheduled, else the most recent (e.g. series over). */
export function pickFeaturedScheduleGame(games: ScheduleGame[]): ScheduleGame | null {
  if (games.length === 0) return null;
  const sorted = [...games].sort(
    (a, b) => Date.parse(a.startTimeUTC) - Date.parse(b.startTimeUTC),
  );

  const live = sorted.find((g) => LIVE_GAME_STATES.has(g.gameState));
  if (live) return live;

  const now = Date.now();
  const upcoming = sorted.filter(
    (g) => g.gameState === "FUT" && Date.parse(g.startTimeUTC) >= now - 120_000,
  );
  if (upcoming.length > 0) return upcoming[0];

  const anyFut = sorted.filter((g) => g.gameState === "FUT");
  if (anyFut.length > 0) return anyFut[0];

  return sorted[sorted.length - 1];
}

function scheduleGameToNextInfo(g: ScheduleGame): NextGameInfo | null {
  const path = g.gameCenterLink?.trim();
  if (!path) return null;
  return {
    gameId: g.id,
    startTimeUTC: g.startTimeUTC,
    gameState: g.gameState,
    gameNumberOfSeries: g.seriesStatus?.gameNumberOfSeries ?? 0,
    awayAbbrev: g.awayTeam.abbrev,
    homeAbbrev: g.homeTeam.abbrev,
    venueDefault: g.venue?.default,
    gameCenterUrl: nhlSiteUrl(path),
  };
}

export function mergeScheduleIntoSeries(
  series: NormalizedSeries[],
  schedule: ScheduleNowResponse,
): void {
  const bySeries = indexPlayoffGamesBySeries(schedule);
  for (const s of series) {
    const games = bySeries.get(s.id);
    const featured = games ? pickFeaturedScheduleGame(games) : null;
    s.nextGame = featured ? scheduleGameToNextInfo(featured) : null;
    s.completedGames = games?.length ? buildCompletedGamesList(games) : [];
  }
}

function seriesKey(roundAbbrev: string, seriesLetter: string): string {
  return `${roundAbbrev}-${seriesLetter}`;
}

export function normalizeCarousel(data: PlayoffCarousel): NormalizedSeries[] {
  const out: NormalizedSeries[] = [];
  for (const round of data.rounds) {
    for (const s of round.series) {
      const needed = s.neededToWin ?? 4;
      let winner: string | null = null;
      if (s.topSeed.wins >= needed) winner = s.topSeed.abbrev;
      else if (s.bottomSeed.wins >= needed) winner = s.bottomSeed.abbrev;

      out.push({
        id: seriesKey(round.roundAbbrev, s.seriesLetter),
        roundNumber: s.roundNumber,
        roundAbbrev: round.roundAbbrev,
        seriesLetter: s.seriesLetter,
        seriesLink: s.seriesLink,
        top: {
          abbrev: s.topSeed.abbrev,
          wins: s.topSeed.wins,
          logo: s.topSeed.logo,
          darkLogo: s.topSeed.darkLogo,
        },
        bottom: {
          abbrev: s.bottomSeed.abbrev,
          wins: s.bottomSeed.wins,
          logo: s.bottomSeed.logo,
          darkLogo: s.bottomSeed.darkLogo,
        },
        neededToWin: needed,
        winnerAbbrev: winner,
      });
    }
  }
  return out.sort((a, b) => {
    if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
    return a.seriesLetter.localeCompare(b.seriesLetter);
  });
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_PREFIX}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NHL API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPlayoffCarousel(
  seasonId: number = seasonIdFromDate(),
): Promise<{ carousel: PlayoffCarousel; normalized: NormalizedSeries[] }> {
  const sid = seasonId;
  const [carousel, schedule] = await Promise.all([
    fetchJson<PlayoffCarousel>(`/v1/playoff-series/carousel/${sid}`),
    fetchJson<ScheduleNowResponse>(`/v1/schedule/now`),
  ]);
  const normalized = normalizeCarousel(carousel);
  mergeScheduleIntoSeries(normalized, schedule);
  return { carousel, normalized };
}

export function isEasternRoundOne(s: NormalizedSeries): boolean {
  return s.roundNumber === 1 && s.seriesLetter >= "A" && s.seriesLetter <= "D";
}

export function isWesternRoundOne(s: NormalizedSeries): boolean {
  return s.roundNumber === 1 && s.seriesLetter >= "E" && s.seriesLetter <= "H";
}
