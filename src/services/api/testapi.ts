import { getF1ApiData } from "./axios";
import { DEFAULT_SEASON, type Season } from "../../domain/f1/seasons";
import type {
  DriverStandingsList,
  DriverStandingsResponse,
} from "./constructorsApi";
import type { DriverDetailResponse } from "../../hooks/queries/useDriverQueries";

const driversApi = (season: Season): string =>
  `/${season}/driverStandings.json`;
const driverStandingsByRoundApi = (
  round: string | number,
  season: Season
): string => `/${season}/${round}/driverStandings.json`;
const driverDetailsApi = (id: string, season: Season): string =>
  `/${season}/drivers/${id}.json`;
const seasonRacesApi = (season: Season): string => `/${season}.json`;

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

const getDriverStandingsTimeline = async (
  season: Season = DEFAULT_SEASON
): Promise<DriverStandingsTimelineRound[]> => {
  const racesResponse = await getF1ApiData<SeasonRacesResponse>(
    seasonRacesApi(season)
  );
  const races = racesResponse?.MRData?.RaceTable?.Races ?? [];
  const roundResults = await Promise.allSettled(
    races.map((race) => getDriverStandingsByRound(race.round, season))
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
        DriverStandings: standingsList.DriverStandings ?? [],
      },
    ];
  });
};

const driversService: DriversService = {
  getDriverStandings(season = DEFAULT_SEASON) {
    return getF1ApiData<DriverStandingsResponse>(driversApi(season));
  },

  getDriverStandingsByRound,

  getDriverStandingsTimeline,

  getbyId(id, season = DEFAULT_SEASON) {
    return getF1ApiData<DriverDetailResponse>(driverDetailsApi(id, season));
  },
};

export default driversService;
