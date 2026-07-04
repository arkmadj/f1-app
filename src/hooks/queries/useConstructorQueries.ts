// Feature-specific React Query hooks for the constructors domain.
//
// The hooks pair query keys from `services/api/queryKeys.ts` with the
// matching service functions in `services/api/constructorsApi.ts` and
// expose a normalised data shape via `select`. Consumers can override
// any TanStack Query option through `options`, except for the ones
// that define each hook's identity (`queryKey`, `queryFn` and, for
// `useConstructorStandings`, `select`).

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
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

const getGallerySeasons = (selectedSeason: Season): Season[] => {
  const selectedYear = Number(selectedSeason);

  return AVAILABLE_SEASONS.filter((season) => Number(season) <= selectedYear).map(
    (season) => season as Season
  );
};

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
  const seasons = useMemo(() => getGallerySeasons(season), [season]);
  const isEnabled = Boolean(constructorId);

  const standingsQueries = useQueries({
    queries: seasons.map((comparisonSeason) => ({
      queryKey: queryKeys.constructors.standings(comparisonSeason),
      queryFn: () => fetchConstructorStandings(comparisonSeason),
      select: selectConstructorStandings,
      enabled: isEnabled,
    })),
  });

  const data = useMemo(() => {
    if (!constructorId) {
      return [];
    }

    return seasons
      .map((comparisonSeason, index) => ({
        season: comparisonSeason,
        standing: (standingsQueries[index]?.data ?? []).find(
          (entry) => entry.Constructor.constructorId === constructorId
        ),
      }))
      .filter(({ standing }) => Boolean(standing));
  }, [constructorId, seasons, standingsQueries]);

  const error =
    standingsQueries.find((query) => query.error instanceof Error)?.error ?? null;

  return {
    data,
    seasons,
    isLoading: standingsQueries.some((query) => query.isLoading),
    isError: standingsQueries.some((query) => query.isError),
    error,
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
