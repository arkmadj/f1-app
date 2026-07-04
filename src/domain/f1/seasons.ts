export type Season = string;

export const DEFAULT_SEASON: Season = new Date().getFullYear().toString();

export const AVAILABLE_SEASONS = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
] as const satisfies readonly Season[];

const FIRST_F1_SEASON = 1950;
const NEXT_SEASON_BUFFER = 1;

const currentYear = (): number => new Date().getFullYear();

export const isValidSeason = (season: unknown): season is Season => {
  if (typeof season !== "string" || !/^[0-9]{4}$/.test(season)) return false;

  const year = Number(season);
  return year >= FIRST_F1_SEASON && year <= currentYear() + NEXT_SEASON_BUFFER;
};

export const normalizeSeason = (season: unknown): Season =>
  isValidSeason(season) ? season : DEFAULT_SEASON;

export const seasonSearchParams = (season: Season): { season?: Season } =>
  season === DEFAULT_SEASON ? {} : { season };

export const isHistoricalSeason = (season: Season): boolean =>
  Number(season) < currentYear();

export const parseSearchParams = (search: string): Record<string, unknown> => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  return Object.fromEntries(params.entries());
};

export const stringifySearchParams = (
  search: Record<string, unknown>
): string => {
  const params = new URLSearchParams();

  Object.entries(search).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};
