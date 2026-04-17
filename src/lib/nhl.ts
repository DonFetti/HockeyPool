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

export type NormalizedSeries = {
  id: string;
  roundNumber: number;
  roundAbbrev: string;
  seriesLetter: string;
  top: NormalizedTeam;
  bottom: NormalizedTeam;
  neededToWin: number;
  winnerAbbrev: string | null;
};

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
  const carousel = await fetchJson<PlayoffCarousel>(
    `/v1/playoff-series/carousel/${seasonId}`,
  );
  return { carousel, normalized: normalizeCarousel(carousel) };
}

export function isEasternRoundOne(s: NormalizedSeries): boolean {
  return s.roundNumber === 1 && s.seriesLetter >= "A" && s.seriesLetter <= "D";
}

export function isWesternRoundOne(s: NormalizedSeries): boolean {
  return s.roundNumber === 1 && s.seriesLetter >= "E" && s.seriesLetter <= "H";
}
