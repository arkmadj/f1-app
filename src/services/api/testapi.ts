import { getF1ApiData } from "./axios";
import { DEFAULT_SEASON, type Season } from "../../domain/f1/seasons";
import type {
  DriverStanding,
  DriverStandingsList,
  DriverStandingsResponse,
} from "./constructorsApi";
import {
  buildStandingsTimeline,
  getSeasonRaceResults,
  getSeasonSprintResults,
} from "./racesApi";
import type { DriverDetailResponse } from "../../hooks/queries/useDriverQueries";

const driversApi = (season: Season): string =>
  `/${season}/driverStandings.json`;
const driverStandingsByRoundApi = (
  round: string | number,
  season: Season
): string => `/${season}/${round}/driverStandings.json`;
const driverDetailsApi = (id: string, season: Season): string =>
  `/${season}/drivers/${id}.json`;
// Returns end-of-season standings for every season the driver competed in.
const driverAllSeasonsStandingsApi = (driverId: string): string =>
  `/drivers/${driverId}/driverStandings.json?limit=100`;

export interface DriverStandingsTimelineRound {
  season: string;
  round: string;
  raceName: string;
  date?: string;
  DriverStandings: DriverStandingsList["DriverStandings"];
}

interface DriversService {
  getDriverStandings: (season?: Season) => Promise<DriverStandingsResponse>;
  getDriverStandingsByRound: (
    round: string | number,
    season?: Season
  ) => Promise<DriverStandingsList | undefined>;
  getDriverStandingsTimeline: (
    season?: Season
  ) => Promise<DriverStandingsTimelineRound[]>;
  /** Returns final-round standings for every season the driver competed in. */
  getAllDriverSeasonStandings: (
    driverId: string
  ) => Promise<DriverStandingsList[]>;
  getbyId: (id: string, season?: Season) => Promise<DriverDetailResponse>;
}

const getDriverStandingsByRound = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<DriverStandingsList | undefined> => {
  const data = await getF1ApiData<DriverStandingsResponse>(
    driverStandingsByRoundApi(round, season)
  );
  return data?.MRData?.StandingsTable?.StandingsLists?.[0];
};

// Derives per-round cumulative driver standings from a couple of bulk requests
// (all race results + all sprint results) instead of one request per round,
// avoiding the previous N+1 request pattern.
const getDriverStandingsTimeline = async (
  season: Season = DEFAULT_SEASON
): Promise<DriverStandingsTimelineRound[]> => {
  const [raceRounds, sprintRounds] = await Promise.all([
    getSeasonRaceResults(season),
    getSeasonSprintResults(season),
  ]);

  return buildStandingsTimeline<DriverStanding>(
    raceRounds,
    sprintRounds,
    (result) => result.Driver.driverId,
    (aggregate, position) => ({
      position: String(position),
      positionText: String(position),
      points: String(aggregate.points),
      wins: String(aggregate.wins),
      Driver: aggregate.latestResult.Driver,
      Constructors: [
        {
          ...aggregate.latestResult.Constructor,
          nationality: aggregate.latestResult.Constructor.nationality ?? "",
        },
      ],
    })
  ).map((round) => ({
    season: round.season,
    round: round.round,
    raceName: round.raceName,
    date: round.date,
    DriverStandings: round.standings,
  }));
};

const getAllDriverSeasonStandings = async (
  driverId: string
): Promise<DriverStandingsList[]> => {
  const data = await getF1ApiData<DriverStandingsResponse>(
    driverAllSeasonsStandingsApi(driverId)
  );
  return data?.MRData?.StandingsTable?.StandingsLists ?? [];
};

const driversService: DriversService = {
  getDriverStandings(season = DEFAULT_SEASON) {
    return getF1ApiData<DriverStandingsResponse>(driversApi(season));
  },

  getDriverStandingsByRound,

  getDriverStandingsTimeline,

  getAllDriverSeasonStandings,

  getbyId(id, season = DEFAULT_SEASON) {
    return getF1ApiData<DriverDetailResponse>(driverDetailsApi(id, season));
  },
};

export default driversService;
