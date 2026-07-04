// Constructors (teams) service for the Ergast / Jolpica F1 API.
//
// All response shapes consumed by the constructors feature live here so that
// hooks, pages and tests share a single source of truth. The service exposes
// a `ConstructorsService` interface to enforce the public contract and keep
// callers strongly-typed end-to-end.

import { getF1ApiData } from "./axios";
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

interface SeasonRace {
  season: string;
  round: string;
  raceName: string;
  date?: string;
}

interface SeasonRacesResponse {
  MRData: {
    RaceTable: {
      Races: SeasonRace[];
    };
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
const seasonRacesApi = (season: Season): string => `/${season}.json`;

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

const getConstructorStandingsTimeline = async (
  season: Season = DEFAULT_SEASON
): Promise<ConstructorStandingsTimelineRound[]> => {
  const racesResponse = await getF1ApiData<SeasonRacesResponse>(
    seasonRacesApi(season)
  );
  const races = racesResponse?.MRData?.RaceTable?.Races ?? [];
  const roundResults = await Promise.allSettled(
    races.map((race) => getConstructorStandingsByRound(race.round, season))
  );

  return races.flatMap((race, index) => {
    const roundResult = roundResults[index];
    if (!roundResult || roundResult.status !== "fulfilled") {
      return [];
    }

    const standingsList = roundResult.value;
    if (!standingsList) {
      return [];
    }

    return [
      {
        season: standingsList.season ?? race.season ?? season,
        round: standingsList.round ?? race.round,
        raceName: race.raceName,
        date: race.date,
        ConstructorStandings: standingsList.ConstructorStandings ?? [],
      },
    ];
  });
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

  getbyId(id, season = DEFAULT_SEASON) {
    return getF1ApiData<ConstructorDetailResponse>(
      constructorDetailsApi(id, season)
    );
  },

  getDriversByConstructor,
};

export default teamsService;
