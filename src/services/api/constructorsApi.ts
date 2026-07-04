// Constructors (teams) service for the Ergast / Jolpica F1 API.
//
// All response shapes consumed by the constructors feature live here so that
// hooks, pages and tests share a single source of truth. The service exposes
// a `ConstructorsService` interface to enforce the public contract and keep
// callers strongly-typed end-to-end.

import { getF1ApiData } from "./axios";
import {
  buildStandingsTimeline,
  getSeasonRaceResults,
  getSeasonSprintResults,
} from "./racesApi";
import { DEFAULT_SEASON, type Season } from "../../domain/f1/seasons";

// ---------------------------------------------------------------------------
// Ergast / Jolpica response shapes
// ---------------------------------------------------------------------------

export interface ErgastConstructor {
  constructorId: string;
  url?: string;
  name: string;
  nationality: string;
}

export interface ErgastDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface DriverStanding {
  position?: string;
  positionText?: string;
  points: string;
  wins?: string;
  Driver: ErgastDriver;
  Constructors: ErgastConstructor[];
}

export interface DriverStandingsList {
  season: string;
  round: string;
  DriverStandings: DriverStanding[];
}

export interface DriverStandingsResponse {
  MRData: {
    StandingsTable: {
      season?: string;
      StandingsLists: DriverStandingsList[];
    };
  };
}

export interface ConstructorStanding {
  position: string;
  positionText?: string;
  points: string;
  wins?: string;
  Constructor: ErgastConstructor;
}

export interface ConstructorStandingsList {
  season: string;
  round: string;
  ConstructorStandings: ConstructorStanding[];
}

export interface ConstructorStandingsTable {
  season?: string;
  StandingsLists: ConstructorStandingsList[];
}

export interface ConstructorStandingsResponse {
  MRData: {
    StandingsTable: ConstructorStandingsTable;
  };
}

export interface ConstructorStandingsTimelineRound {
  season: string;
  round: string;
  raceName: string;
  date?: string;
  ConstructorStandings: ConstructorStandingsList["ConstructorStandings"];
}

export interface ConstructorTable {
  season?: string;
  constructorId?: string;
  Constructors: ErgastConstructor[];
}

export interface ConstructorDetailResponse {
  MRData: {
    ConstructorTable: ConstructorTable;
  };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const teamsApi = (season: Season): string =>
  `/${season}/constructorStandings.json`;
const constructorStandingsByRoundApi = (
  round: string | number,
  season: Season
): string => `/${season}/${round}/constructorStandings.json`;
const driversApi = (season: Season): string =>
  `/${season}/driverStandings.json`;
const constructorDetailsApi = (id: string, season: Season): string =>
  `/${season}/constructors/${id}.json`;
// Returns end-of-season standings for every season the constructor participated
// in — one request instead of one-per-season.
const constructorAllSeasonsStandingsApi = (constructorId: string): string =>
  `/constructors/${constructorId}/constructorStandings.json?limit=100`;

// ---------------------------------------------------------------------------
// Service contract
// ---------------------------------------------------------------------------

export interface ConstructorsService {
  getAll: (season?: Season) => Promise<ConstructorStandingsResponse>;
  getConstructorStandingsByRound: (
    round: string | number,
    season?: Season
  ) => Promise<ConstructorStandingsList | undefined>;
  getConstructorStandingsTimeline: (
    season?: Season
  ) => Promise<ConstructorStandingsTimelineRound[]>;
  /** Returns final-round standings for every season the constructor competed in. */
  getAllSeasonStandings: (
    constructorId: string
  ) => Promise<ConstructorStandingsList[]>;
  getbyId: (id: string, season?: Season) => Promise<ConstructorDetailResponse>;
  getDriversByConstructor: (
    constructorId: string,
    season?: Season
  ) => Promise<DriverStanding[]>;
}

const getConstructorStandingsByRound = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<ConstructorStandingsList | undefined> => {
  const data = await getF1ApiData<ConstructorStandingsResponse>(
    constructorStandingsByRoundApi(round, season)
  );
  return data?.MRData?.StandingsTable?.StandingsLists?.[0];
};

// Derives per-round cumulative constructor standings from a couple of bulk
// requests (all race results + all sprint results) instead of one request per
// round, avoiding the previous N+1 request pattern.
const getConstructorStandingsTimeline = async (
  season: Season = DEFAULT_SEASON
): Promise<ConstructorStandingsTimelineRound[]> => {
  const [raceRounds, sprintRounds] = await Promise.all([
    getSeasonRaceResults(season),
    getSeasonSprintResults(season),
  ]);

  return buildStandingsTimeline<ConstructorStanding>(
    raceRounds,
    sprintRounds,
    (result) => result.Constructor.constructorId,
    (aggregate, position) => ({
      position: String(position),
      positionText: String(position),
      points: String(aggregate.points),
      wins: String(aggregate.wins),
      Constructor: {
        ...aggregate.latestResult.Constructor,
        nationality: aggregate.latestResult.Constructor.nationality ?? "",
      },
    })
  ).map((round) => ({
    season: round.season,
    round: round.round,
    raceName: round.raceName,
    date: round.date,
    ConstructorStandings: round.standings,
  }));
};

const getAllSeasonStandings = async (
  constructorId: string
): Promise<ConstructorStandingsList[]> => {
  const data = await getF1ApiData<ConstructorStandingsResponse>(
    constructorAllSeasonsStandingsApi(constructorId)
  );
  return data?.MRData?.StandingsTable?.StandingsLists ?? [];
};

const getDriversByConstructor = async (
  constructorId: string,
  season: Season = DEFAULT_SEASON
): Promise<DriverStanding[]> => {
  try {
    const data = await getF1ApiData<DriverStandingsResponse>(
      driversApi(season)
    );
    const drivers =
      data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
    return drivers.filter((driver) =>
      driver.Constructors.some(
        (constructor) => constructor.constructorId === constructorId
      )
    );
  } catch (error) {
    console.error("Error fetching drivers by constructor:", error);
    throw error;
  }
};

const teamsService: ConstructorsService = {
  getAll(season = DEFAULT_SEASON) {
    return getF1ApiData<ConstructorStandingsResponse>(teamsApi(season));
  },

  getConstructorStandingsByRound,

  getConstructorStandingsTimeline,

  getAllSeasonStandings,

  getbyId(id, season = DEFAULT_SEASON) {
    return getF1ApiData<ConstructorDetailResponse>(
      constructorDetailsApi(id, season)
    );
  },

  getDriversByConstructor,
};

export default teamsService;
