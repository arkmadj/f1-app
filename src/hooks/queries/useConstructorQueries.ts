// Feature-specific React Query hooks for the constructors domain.
//
// The hooks pair query keys from `services/api/queryKeys.ts` with the
// matching service functions in `services/api/constructorsApi.ts` and
// expose a normalised data shape via `select`. Consumers can override
// any TanStack Query option through `options`, except for the ones
// that define each hook's identity (`queryKey`, `queryFn` and, for
// `useConstructorStandings`, `select`).

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "../../services/api/queryKeys";
import {
  AVAILABLE_SEASONS,
  DEFAULT_SEASON,
  type Season,
} from "../../domain/f1/seasons";
import teamsService from "../../services/api/constructorsApi";
import type {
  ConstructorDetailResponse,
  ConstructorStanding,
  ConstructorStandingsList,
  ConstructorStandingsResponse,
  ConstructorStandingsTimelineRound,
} from "../../services/api/constructorsApi";

// ---------------------------------------------------------------------------
// useConstructorStandings
// ---------------------------------------------------------------------------

type ConstructorStandingsQueryKey = ReturnType<
  typeof queryKeys.constructors.standings
>;

export type UseConstructorStandingsOptions = Omit<
  UseQueryOptions<
    ConstructorStandingsResponse,
    Error,
    ConstructorStanding[],
    ConstructorStandingsQueryKey
  >,
  "queryKey" | "queryFn" | "select"
>;

const fetchConstructorStandings = (
  season: Season
): Promise<ConstructorStandingsResponse> => teamsService.getAll(season);

const selectConstructorStandings = (
  data: ConstructorStandingsResponse
): ConstructorStanding[] =>
  data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];

export interface ConstructorCrossSeasonSnapshot {
  season: Season;
  standing?: ConstructorStanding;
}

export interface UseConstructorCrossSeasonGalleryResult {
  data: ConstructorCrossSeasonSnapshot[];
  seasons: Season[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Seasons the app supports, as a Set, for O(1) membership checks.
const AVAILABLE_SEASONS_SET = new Set<string>(AVAILABLE_SEASONS);

export const useConstructorStandings = (
  season: Season = DEFAULT_SEASON,
  options: UseConstructorStandingsOptions = {}
): UseQueryResult<ConstructorStanding[], Error> =>
  useQuery({
    queryKey: queryKeys.constructors.standings(season),
    queryFn: () => fetchConstructorStandings(season),
    select: selectConstructorStandings,
    ...options,
  });

export const useConstructorCrossSeasonGallery = (
  constructorId: string | undefined,
  season: Season = DEFAULT_SEASON
): UseConstructorCrossSeasonGalleryResult => {
  // Single bulk request: /constructors/{id}/constructorStandings.json?limit=100
  // returns end-of-season standings for every season the constructor competed in,
  // replacing the previous N per-season requests.
  const query = useQuery({
    queryKey: queryKeys.constructors.allSeasonStandings(constructorId),
    queryFn: () => teamsService.getAllSeasonStandings(constructorId as string),
    enabled: Boolean(constructorId),
    throwOnError: false,
  });

  const data = useMemo((): ConstructorCrossSeasonSnapshot[] => {
    if (!constructorId || !query.data) return [];

    const selectedYear = Number(season);

    return (query.data as ConstructorStandingsList[])
      .filter(
        (list) =>
          AVAILABLE_SEASONS_SET.has(list.season) &&
          Number(list.season) <= selectedYear
      )
      .map((list) => ({
        season: list.season as Season,
        standing: list.ConstructorStandings[0],
      }));
  }, [constructorId, season, query.data]);

  return {
    data,
    seasons: data.map((s) => s.season),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

// ---------------------------------------------------------------------------
// useConstructorStandingsTimeline
// ---------------------------------------------------------------------------

type ConstructorStandingsTimelineQueryKey = ReturnType<
  typeof queryKeys.constructors.standingsTimeline
>;

export type UseConstructorStandingsTimelineOptions = Omit<
  UseQueryOptions<
    ConstructorStandingsTimelineRound[],
    Error,
    ConstructorStandingsTimelineRound[],
    ConstructorStandingsTimelineQueryKey
  >,
  "queryKey" | "queryFn"
>;

const fetchConstructorStandingsTimeline = (
  season: Season
): Promise<ConstructorStandingsTimelineRound[]> =>
  teamsService.getConstructorStandingsTimeline(season);

export const useConstructorStandingsTimeline = (
  season: Season = DEFAULT_SEASON,
  options: UseConstructorStandingsTimelineOptions = {}
): UseQueryResult<ConstructorStandingsTimelineRound[], Error> =>
  useQuery({
    queryKey: queryKeys.constructors.standingsTimeline(season),
    queryFn: () => fetchConstructorStandingsTimeline(season),
    ...options,
  });

// ---------------------------------------------------------------------------
// useConstructor
// ---------------------------------------------------------------------------

type ConstructorDetailQueryKey = ReturnType<
  typeof queryKeys.constructors.detail
>;

export type UseConstructorOptions = Omit<
  UseQueryOptions<
    ConstructorDetailResponse,
    Error,
    ConstructorDetailResponse,
    ConstructorDetailQueryKey
  >,
  "queryKey" | "queryFn"
>;

const fetchConstructor = (
  id: string,
  season: Season
): Promise<ConstructorDetailResponse> => teamsService.getbyId(id, season);

export const useConstructor = (
  id: string | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseConstructorOptions = {}
): UseQueryResult<ConstructorDetailResponse, Error> =>
  useQuery({
    queryKey: queryKeys.constructors.detail(id, season),
    queryFn: () => fetchConstructor(id as string, season),
    enabled: Boolean(id),
    ...options,
  });
