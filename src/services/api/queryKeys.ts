// Centralized query key factory for TanStack Query.
//
// Every key used with `useQuery`, `queryClient.invalidateQueries`,
// `queryClient.setQueryData`, etc. should be sourced from here so that
// invalidation can be done at the exact level of granularity needed:
//
//   queryClient.invalidateQueries({ queryKey: queryKeys.races.all });
//     -> every race query (current season, results, sprints, qualifying...)
//
//   queryClient.invalidateQueries({ queryKey: queryKeys.races.qualifyings() });
//     -> every qualifying query, regardless of round
//
//   queryClient.invalidateQueries({ queryKey: queryKeys.races.qualifying(5) });
//     -> only round 5's qualifying

import { DEFAULT_SEASON, type Season } from "../../domain/f1/seasons";

type QueryKeyPart = string | number | undefined;

export const queryKeys = {
  news: {
    all: ["news"] as const,
    latest: (limit: number = 6) =>
      [...queryKeys.news.all, "latest", limit] as const,
  },

  drivers: {
    all: ["drivers"] as const,
    standings: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.drivers.all, "standings", season] as const,
    standingsTimeline: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.drivers.standings(season), "timeline"] as const,
    details: () => [...queryKeys.drivers.all, "detail"] as const,
    detail: (id: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.drivers.details(), season, id] as const,
    byConstructor: (
      constructorId: QueryKeyPart,
      season: Season = DEFAULT_SEASON
    ) =>
      [
        ...queryKeys.drivers.all,
        "byConstructor",
        season,
        constructorId,
      ] as const,
  },

  constructors: {
    all: ["constructors"] as const,
    standings: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.constructors.all, "standings", season] as const,
    standingsTimeline: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.constructors.standings(season), "timeline"] as const,
    details: () => [...queryKeys.constructors.all, "detail"] as const,
    detail: (id: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.constructors.details(), season, id] as const,
  },

  circuits: {
    all: ["circuits"] as const,
    details: () => [...queryKeys.circuits.all, "detail"] as const,
    detail: (id: QueryKeyPart) =>
      [...queryKeys.circuits.details(), id] as const,
    winners: (id: QueryKeyPart) =>
      [...queryKeys.circuits.detail(id), "winners"] as const,
    podiumFinishers: (id: QueryKeyPart) =>
      [...queryKeys.circuits.detail(id), "podiumFinishers"] as const,
    poleSitters: (id: QueryKeyPart) =>
      [...queryKeys.circuits.detail(id), "poleSitters"] as const,
  },

  races: {
    all: ["races"] as const,
    season: (season: QueryKeyPart) =>
      [...queryKeys.races.all, "season", season] as const,
    current: (season: Season = DEFAULT_SEASON) =>
      queryKeys.races.season(season),

    last: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.all, "last", season] as const,
    lastInfo: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.last(season), "info"] as const,
    lastResults: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.last(season), "results"] as const,

    results: () => [...queryKeys.races.all, "results"] as const,
    resultsAll: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.results(), season, "all"] as const,
    raceResult: (round: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.results(), season, round] as const,
    highlights: (raceName: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.all, "highlights", season, raceName] as const,
    stewardInvestigations: (
      round: QueryKeyPart,
      season: Season = DEFAULT_SEASON
    ) => [...queryKeys.races.all, "stewardInvestigations", season, round] as const,
    pitStops: () => [...queryKeys.races.all, "pitstops"] as const,
    pitStop: (round: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.pitStops(), season, round] as const,
    lapTimings: () => [...queryKeys.races.all, "laps"] as const,
    lapTiming: (round: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.lapTimings(), season, round] as const,
    driverResults: (driverId: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.results(), season, "driver", driverId] as const,
    constructorResults: (
      constructorId: QueryKeyPart,
      season: Season = DEFAULT_SEASON
    ) =>
      [
        ...queryKeys.races.results(),
        season,
        "constructor",
        constructorId,
      ] as const,

    sprints: () => [...queryKeys.races.all, "sprint"] as const,
    sprintList: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.sprints(), season] as const,
    sprintAll: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.sprints(), season, "all"] as const,
    sprintResult: (round: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.sprints(), season, round] as const,

    qualifyings: () => [...queryKeys.races.all, "qualifying"] as const,
    qualifyingAll: (season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.qualifyings(), season, "all"] as const,
    qualifying: (round: QueryKeyPart, season: Season = DEFAULT_SEASON) =>
      [...queryKeys.races.qualifyings(), season, round] as const,
  },
};

export const SEASON_KEY = DEFAULT_SEASON;
