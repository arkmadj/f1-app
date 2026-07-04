// Feature-specific React Query hooks for the drivers domain.
//
// Each hook centralises the queryKey + queryFn + default `select` mapping
// so consumers receive a ready-to-render shape and the cache stays keyed
// in lockstep with `services/api/queryKeys.ts`. Extra TanStack Query options
// (e.g. `enabled`, `staleTime`, `select`) can still be supplied per call
// site via the `options` argument and will override the defaults.

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "../../services/api/queryKeys";
import {
  AVAILABLE_SEASONS,
  DEFAULT_SEASON,
  type Season,
} from "../../domain/f1/seasons";
import driversService from "../../services/api/testapi";
import type { DriverStandingsTimelineRound } from "../../services/api/testapi";
import teamsService from "../../services/api/constructorsApi";
import type {
  DriverStanding,
  DriverStandingsResponse,
  ErgastDriver,
} from "../../services/api/constructorsApi";
import {
  getAllQualifyingResults,
  getDriverRaceResults,
  type QualifyingRaceWithResults,
  type RaceResult,
} from "../../services/api/racesApi";

const CROSS_SEASON_COMPARISON_WINDOW = 4;

// ---------------------------------------------------------------------------
// Driver detail response shape (Ergast / Jolpica `/drivers/{id}.json`)
// ---------------------------------------------------------------------------

export interface DriverTable {
  season?: string;
  driverId?: string;
  Drivers: ErgastDriver[];
}

export interface DriverDetailResponse {
  MRData: {
    DriverTable: DriverTable;
  };
}

// ---------------------------------------------------------------------------
// useDriverStandings
// ---------------------------------------------------------------------------

type DriverStandingsQueryKey = ReturnType<typeof queryKeys.drivers.standings>;

export type UseDriverStandingsOptions = Omit<
  UseQueryOptions<
    DriverStandingsResponse,
    Error,
    DriverStanding[],
    DriverStandingsQueryKey
  >,
  "queryKey" | "queryFn" | "select"
>;

const fetchDriverStandings = (
  season: Season
): Promise<DriverStandingsResponse> =>
  driversService.getDriverStandings(season) as Promise<DriverStandingsResponse>;

const selectDriverStandings = (
  data: DriverStandingsResponse
): DriverStanding[] =>
  data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];

export const useDriverStandings = (
  season: Season = DEFAULT_SEASON,
  options: UseDriverStandingsOptions = {}
): UseQueryResult<DriverStanding[], Error> =>
  useQuery({
    queryKey: queryKeys.drivers.standings(season),
    queryFn: () => fetchDriverStandings(season),
    select: selectDriverStandings,
    ...options,
  });

export interface DriverCrossSeasonSnapshot {
  season: Season;
  standing?: DriverStanding;
  raceResults: RaceResult[];
  qualifyingResults: QualifyingRaceWithResults[];
}

export interface UseDriverCrossSeasonComparisonResult {
  data: DriverCrossSeasonSnapshot[];
  seasons: Season[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const getComparisonSeasons = (selectedSeason: Season): Season[] => {
  const selectedYear = Number(selectedSeason);

  return AVAILABLE_SEASONS.filter((season) => Number(season) <= selectedYear)
    .slice(0, CROSS_SEASON_COMPARISON_WINDOW)
    .map((season) => season as Season);
};

export const useDriverCrossSeasonComparison = (
  driverId: string | undefined,
  season: Season = DEFAULT_SEASON
): UseDriverCrossSeasonComparisonResult => {
  const seasons = useMemo(() => getComparisonSeasons(season), [season]);
  const isEnabled = Boolean(driverId);

  const standingsQueries = useQueries({
    queries: seasons.map((comparisonSeason) => ({
      queryKey: queryKeys.drivers.standings(comparisonSeason),
      queryFn: () => fetchDriverStandings(comparisonSeason),
      select: selectDriverStandings,
      enabled: isEnabled,
    })),
  });
  const raceQueries = useQueries({
    queries: seasons.map((comparisonSeason) => ({
      queryKey: queryKeys.races.driverResults(driverId, comparisonSeason),
      queryFn: () => getDriverRaceResults(driverId as string, comparisonSeason),
      enabled: isEnabled,
    })),
  });
  const qualifyingQueries = useQueries({
    queries: seasons.map((comparisonSeason) => ({
      queryKey: queryKeys.races.qualifyingAll(comparisonSeason),
      queryFn: () => getAllQualifyingResults(comparisonSeason),
      enabled: isEnabled,
    })),
  });
  const allQueries = [...standingsQueries, ...raceQueries, ...qualifyingQueries];

  const data = useMemo(() => {
    if (!driverId) {
      return [];
    }

    return seasons
      .map((comparisonSeason, index) => {
        const standing = (standingsQueries[index]?.data ?? []).find(
          (driver) => driver.Driver.driverId === driverId
        );

        return {
          season: comparisonSeason,
          standing,
          raceResults: raceQueries[index]?.data ?? [],
          qualifyingResults: qualifyingQueries[index]?.data ?? [],
        };
      })
      .filter(
        ({ standing, raceResults, qualifyingResults }) =>
          Boolean(standing) ||
          raceResults.length > 0 ||
          qualifyingResults.some((race) =>
            race.results.some((result) => result.Driver.driverId === driverId)
          )
      );
  }, [driverId, qualifyingQueries, raceQueries, seasons, standingsQueries]);

  const error =
    allQueries.find((query) => query.error instanceof Error)?.error ?? null;

  return {
    data,
    seasons,
    isLoading: allQueries.some((query) => query.isLoading),
    isError: allQueries.some((query) => query.isError),
    error,
  };
};

// ---------------------------------------------------------------------------
// useDriverStandingsTimeline
// ---------------------------------------------------------------------------

type DriverStandingsTimelineQueryKey = ReturnType<
  typeof queryKeys.drivers.standingsTimeline
>;

export type UseDriverStandingsTimelineOptions = Omit<
  UseQueryOptions<
    DriverStandingsTimelineRound[],
    Error,
    DriverStandingsTimelineRound[],
    DriverStandingsTimelineQueryKey
  >,
  "queryKey" | "queryFn"
>;

const fetchDriverStandingsTimeline = (
  season: Season
): Promise<DriverStandingsTimelineRound[]> =>
  driversService.getDriverStandingsTimeline(season);

export const useDriverStandingsTimeline = (
  season: Season = DEFAULT_SEASON,
  options: UseDriverStandingsTimelineOptions = {}
): UseQueryResult<DriverStandingsTimelineRound[], Error> =>
  useQuery({
    queryKey: queryKeys.drivers.standingsTimeline(season),
    queryFn: () => fetchDriverStandingsTimeline(season),
    ...options,
  });

// ---------------------------------------------------------------------------
// useDriver
// ---------------------------------------------------------------------------

type DriverDetailQueryKey = ReturnType<typeof queryKeys.drivers.detail>;

export type UseDriverOptions = Omit<
  UseQueryOptions<
    DriverDetailResponse,
    Error,
    DriverDetailResponse,
    DriverDetailQueryKey
  >,
  "queryKey" | "queryFn"
>;

const fetchDriver = (
  id: string,
  season: Season
): Promise<DriverDetailResponse> =>
  driversService.getbyId(id, season) as Promise<DriverDetailResponse>;

export const useDriver = (
  id: string | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseDriverOptions = {}
): UseQueryResult<DriverDetailResponse, Error> =>
  useQuery({
    queryKey: queryKeys.drivers.detail(id, season),
    queryFn: () => fetchDriver(id as string, season),
    enabled: Boolean(id),
    ...options,
  });

// ---------------------------------------------------------------------------
// useDriversByConstructor
// ---------------------------------------------------------------------------

type DriversByConstructorQueryKey = ReturnType<
  typeof queryKeys.drivers.byConstructor
>;

export type UseDriversByConstructorOptions = Omit<
  UseQueryOptions<
    DriverStanding[],
    Error,
    DriverStanding[],
    DriversByConstructorQueryKey
  >,
  "queryKey" | "queryFn"
>;

const fetchDriversByConstructor = (
  constructorId: string,
  season: Season
): Promise<DriverStanding[]> =>
  teamsService.getDriversByConstructor(constructorId, season);

export const useDriversByConstructor = (
  constructorId: string | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseDriversByConstructorOptions = {}
): UseQueryResult<DriverStanding[], Error> =>
  useQuery({
    queryKey: queryKeys.drivers.byConstructor(constructorId, season),
    queryFn: () => fetchDriversByConstructor(constructorId as string, season),
    enabled: Boolean(constructorId),
    ...options,
  });
