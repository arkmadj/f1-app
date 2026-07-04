// Feature-specific React Query hooks for the races domain.
//
// Wraps every endpoint exposed by `services/api/racesApi.ts` with a
// matching key from `services/api/queryKeys.ts`, so cache invalidation
// can target a single round, an entire session type or the whole
// races namespace as documented in the query-key factory. The hooks
// surface the typed return shapes from the service so consumers get
// end-to-end TypeScript safety.

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "../../services/api/queryKeys";
import { DEFAULT_SEASON, type Season } from "../../domain/f1/seasons";
import { getOfficialF1RaceHighlightsUrl } from "../../services/api/highlightsApi";
import {
  getCurrentSeasonRaces,
  getConstructorRaceResults,
  getDriverRaceResults,
  getCircuit,
  getCircuitPodiumFinishers,
  getCircuitPoleSitters,
  getCircuitRaceWinners,
  getAllRaceResults,
  getRaceResults,
  getRaceStewardInvestigations,
  getRacePitStops,
  getRaceLapTimings,
  getAllSprintResults,
  getSprintResults,
  getSprintRaces,
  getQualifyingResults,
  getAllQualifyingResults,
  getLastRaceResults,
  getRaceInfo,
} from "../../services/api/racesApi";
import type {
  ErgastRace,
  ErgastCircuit,
  PitStop,
  QualifyingRaceWithResults,
  QualifyingResult,
  RaceLap,
  RaceResult,
  StewardInvestigation,
  RaceWithResults,
  SprintRaceWithResults,
  SprintResult,
} from "../../services/api/racesApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Round = string | number;

type QueryOptions<TData, TQueryKey extends readonly unknown[]> = Omit<
  UseQueryOptions<TData, Error, TData, TQueryKey>,
  "queryKey" | "queryFn"
>;

// ---------------------------------------------------------------------------
// Current-season races
// ---------------------------------------------------------------------------

type CurrentSeasonRacesQueryKey = ReturnType<typeof queryKeys.races.current>;

export type UseCurrentSeasonRacesOptions = QueryOptions<
  ErgastRace[],
  CurrentSeasonRacesQueryKey
>;

export const useCurrentSeasonRaces = (
  season: Season = DEFAULT_SEASON,
  options: UseCurrentSeasonRacesOptions = {}
): UseQueryResult<ErgastRace[], Error> =>
  useQuery({
    queryKey: queryKeys.races.current(season),
    queryFn: () => getCurrentSeasonRaces(season),
    ...options,
  });

type CircuitProfileQueryKey = ReturnType<typeof queryKeys.circuits.detail>;

export type UseCircuitProfileOptions = QueryOptions<
  ErgastCircuit | null,
  CircuitProfileQueryKey
>;

export const useCircuitProfile = (
  circuitId: string | undefined,
  options: UseCircuitProfileOptions = {}
): UseQueryResult<ErgastCircuit | null, Error> =>
  useQuery({
    queryKey: queryKeys.circuits.detail(circuitId),
    queryFn: () => getCircuit(circuitId as string),
    enabled: Boolean(circuitId),
    ...options,
  });

type CircuitRaceWinnersQueryKey = ReturnType<typeof queryKeys.circuits.winners>;

export type UseCircuitRaceWinnersOptions = QueryOptions<
  ErgastRace[],
  CircuitRaceWinnersQueryKey
>;

export const useCircuitRaceWinners = (
  circuitId: string | undefined,
  options: UseCircuitRaceWinnersOptions = {}
): UseQueryResult<ErgastRace[], Error> =>
  useQuery({
    queryKey: queryKeys.circuits.winners(circuitId),
    queryFn: () => getCircuitRaceWinners(circuitId as string),
    enabled: Boolean(circuitId),
    ...options,
  });

type CircuitPodiumFinishersQueryKey = ReturnType<
  typeof queryKeys.circuits.podiumFinishers
>;

export type UseCircuitPodiumFinishersOptions = QueryOptions<
  ErgastRace[],
  CircuitPodiumFinishersQueryKey
>;

export const useCircuitPodiumFinishers = (
  circuitId: string | undefined,
  options: UseCircuitPodiumFinishersOptions = {}
): UseQueryResult<ErgastRace[], Error> =>
  useQuery({
    queryKey: queryKeys.circuits.podiumFinishers(circuitId),
    queryFn: () => getCircuitPodiumFinishers(circuitId as string),
    enabled: Boolean(circuitId),
    ...options,
  });

type CircuitPoleSittersQueryKey = ReturnType<
  typeof queryKeys.circuits.poleSitters
>;

export type UseCircuitPoleSittersOptions = QueryOptions<
  ErgastRace[],
  CircuitPoleSittersQueryKey
>;

export const useCircuitPoleSitters = (
  circuitId: string | undefined,
  options: UseCircuitPoleSittersOptions = {}
): UseQueryResult<ErgastRace[], Error> =>
  useQuery({
    queryKey: queryKeys.circuits.poleSitters(circuitId),
    queryFn: () => getCircuitPoleSitters(circuitId as string),
    enabled: Boolean(circuitId),
    ...options,
  });

// ---------------------------------------------------------------------------
// Race results (per round)
// ---------------------------------------------------------------------------

type RaceResultQueryKey = ReturnType<typeof queryKeys.races.raceResult>;
type RaceResultsAllQueryKey = ReturnType<typeof queryKeys.races.resultsAll>;

export type UseRaceResultsOptions = QueryOptions<
  RaceResult[],
  RaceResultQueryKey
>;

export type UseAllRaceResultsOptions = QueryOptions<
  RaceWithResults[],
  RaceResultsAllQueryKey
>;

export const useRaceResults = (
  round: Round | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseRaceResultsOptions = {}
): UseQueryResult<RaceResult[], Error> =>
  useQuery({
    queryKey: queryKeys.races.raceResult(round, season),
    queryFn: () => getRaceResults(round as Round, season),
    enabled: Boolean(round),
    ...options,
  });

export const useAllRaceResults = (
  season: Season = DEFAULT_SEASON,
  options: UseAllRaceResultsOptions = {}
): UseQueryResult<RaceWithResults[], Error> =>
  useQuery({
    queryKey: queryKeys.races.resultsAll(season),
    queryFn: () => getAllRaceResults(season),
    ...options,
  });

type StewardInvestigationsQueryKey = ReturnType<
  typeof queryKeys.races.stewardInvestigations
>;

export type UseStewardInvestigationsOptions = QueryOptions<
  StewardInvestigation[],
  StewardInvestigationsQueryKey
>;

export const useStewardInvestigations = (
  raceInfo: ErgastRace | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseStewardInvestigationsOptions = {}
): UseQueryResult<StewardInvestigation[], Error> =>
  useQuery({
    queryKey: queryKeys.races.stewardInvestigations(raceInfo?.round, season),
    queryFn: () => getRaceStewardInvestigations(raceInfo as ErgastRace, season),
    enabled: Boolean(raceInfo),
    staleTime: 24 * 60 * 60 * 1000,
    ...options,
  });

type RacePitStopQueryKey = ReturnType<typeof queryKeys.races.pitStop>;
type RaceLapTimingQueryKey = ReturnType<typeof queryKeys.races.lapTiming>;

export type UseRacePitStopsOptions = QueryOptions<
  PitStop[],
  RacePitStopQueryKey
>;

export type UseRaceLapTimingsOptions = QueryOptions<
  RaceLap[],
  RaceLapTimingQueryKey
>;

export const useRacePitStops = (
  round: Round | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseRacePitStopsOptions = {}
): UseQueryResult<PitStop[], Error> =>
  useQuery({
    queryKey: queryKeys.races.pitStop(round, season),
    queryFn: () => getRacePitStops(round as Round, season),
    enabled: Boolean(round),
    ...options,
  });

export const useRaceLapTimings = (
  round: Round | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseRaceLapTimingsOptions = {}
): UseQueryResult<RaceLap[], Error> =>
  useQuery({
    queryKey: queryKeys.races.lapTiming(round, season),
    queryFn: () => getRaceLapTimings(round as Round, season),
    enabled: Boolean(round),
    ...options,
  });

type DriverRaceResultsQueryKey = ReturnType<
  typeof queryKeys.races.driverResults
>;

export type UseDriverRaceResultsOptions = QueryOptions<
  RaceResult[],
  DriverRaceResultsQueryKey
>;

export const useDriverRaceResults = (
  driverId: string | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseDriverRaceResultsOptions = {}
): UseQueryResult<RaceResult[], Error> =>
  useQuery({
    queryKey: queryKeys.races.driverResults(driverId, season),
    queryFn: () => getDriverRaceResults(driverId as string, season),
    enabled: Boolean(driverId),
    ...options,
  });

type ConstructorRaceResultsQueryKey = ReturnType<
  typeof queryKeys.races.constructorResults
>;

export type UseConstructorRaceResultsOptions = QueryOptions<
  RaceResult[],
  ConstructorRaceResultsQueryKey
>;

export const useConstructorRaceResults = (
  constructorId: string | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseConstructorRaceResultsOptions = {}
): UseQueryResult<RaceResult[], Error> =>
  useQuery({
    queryKey: queryKeys.races.constructorResults(constructorId, season),
    queryFn: () => getConstructorRaceResults(constructorId as string, season),
    enabled: Boolean(constructorId),
    ...options,
  });

// ---------------------------------------------------------------------------
// Sprint results (per round) and sprint races list
// ---------------------------------------------------------------------------

type SprintResultQueryKey = ReturnType<typeof queryKeys.races.sprintResult>;
type SprintListQueryKey = ReturnType<typeof queryKeys.races.sprintList>;
type SprintAllQueryKey = ReturnType<typeof queryKeys.races.sprintAll>;

export type UseSprintResultsOptions = QueryOptions<
  SprintResult[],
  SprintResultQueryKey
>;

export type UseAllSprintResultsOptions = QueryOptions<
  SprintRaceWithResults[],
  SprintAllQueryKey
>;

export type UseSprintRacesOptions = QueryOptions<
  ErgastRace[],
  SprintListQueryKey
>;

export const useSprintResults = (
  round: Round | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseSprintResultsOptions = {}
): UseQueryResult<SprintResult[], Error> =>
  useQuery({
    queryKey: queryKeys.races.sprintResult(round, season),
    queryFn: () => getSprintResults(round as Round, season),
    enabled: Boolean(round),
    ...options,
  });

export const useSprintRaces = (
  season: Season = DEFAULT_SEASON,
  options: UseSprintRacesOptions = {}
): UseQueryResult<ErgastRace[], Error> =>
  useQuery({
    queryKey: queryKeys.races.sprintList(season),
    queryFn: () => getSprintRaces(season),
    ...options,
  });

export const useAllSprintResults = (
  season: Season = DEFAULT_SEASON,
  options: UseAllSprintResultsOptions = {}
): UseQueryResult<SprintRaceWithResults[], Error> =>
  useQuery({
    queryKey: queryKeys.races.sprintAll(season),
    queryFn: () => getAllSprintResults(season),
    ...options,
  });

// ---------------------------------------------------------------------------
// Qualifying results (per round and full-season aggregate)
// ---------------------------------------------------------------------------

type QualifyingQueryKey = ReturnType<typeof queryKeys.races.qualifying>;
type QualifyingAllQueryKey = ReturnType<typeof queryKeys.races.qualifyingAll>;

export type UseQualifyingResultsOptions = QueryOptions<
  QualifyingResult[],
  QualifyingQueryKey
>;

export type UseAllQualifyingResultsOptions = QueryOptions<
  QualifyingRaceWithResults[],
  QualifyingAllQueryKey
>;

export const useQualifyingResults = (
  round: Round | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseQualifyingResultsOptions = {}
): UseQueryResult<QualifyingResult[], Error> =>
  useQuery({
    queryKey: queryKeys.races.qualifying(round, season),
    queryFn: () => getQualifyingResults(round as Round, season),
    enabled: Boolean(round),
    ...options,
  });

export const useAllQualifyingResults = (
  season: Season = DEFAULT_SEASON,
  options: UseAllQualifyingResultsOptions = {}
): UseQueryResult<QualifyingRaceWithResults[], Error> =>
  useQuery({
    queryKey: queryKeys.races.qualifyingAll(season),
    queryFn: () => getAllQualifyingResults(season),
    ...options,
  });

// ---------------------------------------------------------------------------
// Last race (results and metadata)
// ---------------------------------------------------------------------------

type LastResultsQueryKey = ReturnType<typeof queryKeys.races.lastResults>;
type LastInfoQueryKey = ReturnType<typeof queryKeys.races.lastInfo>;

export type UseLastRaceResultsOptions = QueryOptions<
  RaceResult[],
  LastResultsQueryKey
>;

export type UseLastRaceInfoOptions = QueryOptions<
  ErgastRace | undefined,
  LastInfoQueryKey
>;

export const useLastRaceResults = (
  season: Season = DEFAULT_SEASON,
  options: UseLastRaceResultsOptions = {}
): UseQueryResult<RaceResult[], Error> =>
  useQuery({
    queryKey: queryKeys.races.lastResults(season),
    queryFn: () => getLastRaceResults(season),
    ...options,
  });

export const useLastRaceInfo = (
  season: Season = DEFAULT_SEASON,
  options: UseLastRaceInfoOptions = {}
): UseQueryResult<ErgastRace | undefined, Error> =>
  useQuery({
    queryKey: queryKeys.races.lastInfo(season),
    queryFn: () => getRaceInfo(season),
    ...options,
  });

type RaceHighlightsQueryKey = ReturnType<typeof queryKeys.races.highlights>;

export type UseRaceHighlightsOptions = QueryOptions<
  string | undefined,
  RaceHighlightsQueryKey
>;

export const useRaceHighlights = (
  raceName: string | undefined,
  season: Season = DEFAULT_SEASON,
  options: UseRaceHighlightsOptions = {}
): UseQueryResult<string | undefined, Error> =>
  useQuery({
    queryKey: queryKeys.races.highlights(raceName, season),
    queryFn: () =>
      getOfficialF1RaceHighlightsUrl({ raceName: raceName as string, season }),
    enabled: Boolean(raceName),
    staleTime: 24 * 60 * 60 * 1000,
    ...options,
  });
