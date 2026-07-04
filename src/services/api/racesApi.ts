// Races service for the Ergast / Jolpica F1 API.
//
// All response shapes consumed by the races feature live here so that
// hooks, pages and tests share a single source of truth. Every endpoint
// goes through axios with typed responses and consistent try/catch
// error handling so callers receive a strongly-typed contract and
// upstream failures are surfaced (and logged) uniformly.

import { getF1ApiData } from "./axios";
import { DEFAULT_SEASON, type Season } from "../../domain/f1/seasons";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";

// ---------------------------------------------------------------------------
// Ergast / Jolpica response shapes
// ---------------------------------------------------------------------------

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

export interface ErgastConstructor {
  constructorId: string;
  url?: string;
  name: string;
  nationality?: string;
}

export interface ErgastLocation {
  locality: string;
  country: string;
  lat?: string;
  long?: string;
}

export interface ErgastCircuit {
  circuitId: string;
  url?: string;
  circuitName: string;
  Location: ErgastLocation;
}

export interface LapTime {
  time?: string;
  millis?: string;
}

export interface AverageSpeed {
  units?: string;
  speed?: string;
}

export interface FastestLap {
  rank?: string;
  lap?: string;
  Time?: LapTime;
  AverageSpeed?: AverageSpeed;
}

export interface PitStop {
  driverId: string;
  lap?: string;
  stop?: string;
  time?: string;
  duration?: string;
  compound?: string;
  tireCompound?: string;
  tyreCompound?: string;
  tire?: { compound?: string };
  tyre?: { compound?: string };
}

export interface LapTiming {
  driverId: string;
  position: string;
  time?: string;
}

export interface RaceLap {
  number: string;
  Timings?: LapTiming[];
}

export interface RaceResult {
  season?: string;
  round?: string;
  raceName?: string;
  date?: string;
  number?: string;
  position: string;
  positionText?: string;
  points: string;
  Driver: ErgastDriver;
  Constructor: ErgastConstructor;
  grid?: string;
  laps?: string;
  status?: string;
  Time?: LapTime;
  FastestLap?: FastestLap;
}

export type SprintResult = RaceResult;

export interface QualifyingResult {
  number?: string;
  position: string;
  Driver: ErgastDriver;
  Constructor: ErgastConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface ErgastRace {
  season: string;
  round: string;
  url?: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: ErgastCircuit;
  Results?: RaceResult[];
  PitStops?: PitStop[];
  Laps?: RaceLap[];
  SprintResults?: SprintResult[];
  QualifyingResults?: QualifyingResult[];
}

export interface RaceTable {
  season?: string;
  round?: string;
  Races: ErgastRace[];
}

export interface CircuitTable {
  circuitId?: string;
  Circuits: ErgastCircuit[];
}

export interface RacesResponse {
  MRData: {
    RaceTable: RaceTable;
  };
}

export interface CircuitsResponse {
  MRData: {
    CircuitTable: CircuitTable;
  };
}

export interface QualifyingRaceWithResults extends ErgastRace {
  results: QualifyingResult[];
}

export interface RaceWithResults extends ErgastRace {
  results: RaceResult[];
}

export interface SprintRaceWithResults extends ErgastRace {
  results: SprintResult[];
}

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type?: string;
  date_start?: string;
  date_end?: string;
  meeting_key?: number;
  country_name?: string;
  location?: string;
  year?: number;
  is_cancelled?: boolean;
}

export interface OpenF1RaceControlMessage {
  meeting_key?: number;
  session_key?: number;
  date: string;
  driver_number?: number | null;
  lap_number?: number | null;
  category?: string | null;
  flag?: string | null;
  scope?: string | null;
  sector?: number | null;
  message: string;
}

export type StewardInvestigationStatus =
  | "under-investigation"
  | "no-further-action"
  | "penalty"
  | "warning"
  | "stewards-note";

export interface StewardInvestigation {
  id: string;
  date: string;
  lapNumber: number | null;
  driverNumber: number | null;
  category: string | null;
  message: string;
  status: StewardInvestigationStatus;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const seasonRacesUrl = (season: Season): string => `/${season}.json`;
const sprintRacesUrl = (season: Season): string => `/${season}/sprint.json`;
const lastResultsUrl = (season: Season): string =>
  `/${season}/last/results.json`;

const raceResultsUrl = (round: string | number, season: Season): string =>
  `/${season}/${round}/results.json`;
const pitStopsUrl = (round: string | number, season: Season): string =>
  `/${season}/${round}/pitstops.json`;
const raceLapTimingsUrl = (round: string | number, season: Season): string =>
  `/${season}/${round}/laps.json`;
const driverRaceResultsUrl = (driverId: string, season: Season): string =>
  `/${season}/drivers/${driverId}/results.json`;
const constructorRaceResultsUrl = (
  constructorId: string,
  season: Season
): string => `/${season}/constructors/${constructorId}/results.json`;
const sprintResultsUrl = (round: string | number, season: Season): string =>
  `/${season}/${round}/sprint.json`;
const qualifyingResultsUrl = (round: string | number, season: Season): string =>
  `/${season}/${round}/qualifying.json`;
const circuitUrl = (circuitId: string): string => `/circuits/${circuitId}.json`;
const circuitRaceWinnersUrl = (circuitId: string): string =>
  `/circuits/${circuitId}/results/1.json?limit=100`;
const circuitPodiumFinishersUrl = (
  circuitId: string,
  position: 1 | 2 | 3
): string => `/circuits/${circuitId}/results/${position}.json?limit=100`;
const circuitPoleSittersUrl = (circuitId: string): string =>
  `/circuits/${circuitId}/qualifying/1.json?limit=100`;

const STEWARD_INVESTIGATION_MESSAGE_REGEX =
  /fia stewards:|under investigation|no further investigation|penalty|reprimand|warning/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetchRaceTable = async (
  url: string,
  errorContext: string
): Promise<ErgastRace[]> => {
  try {
    const data = await getF1ApiData<RacesResponse>(url);
    return data?.MRData?.RaceTable?.Races ?? [];
  } catch (error) {
    console.error(`Error fetching ${errorContext}:`, error);
    throw error;
  }
};

const firstRace = (races: ErgastRace[]): ErgastRace | undefined => races[0];

const normalizeRaceDateTime = (raceInfo: ErgastRace): string => {
  const normalizedTime = raceInfo.time
    ? raceInfo.time.endsWith("Z")
      ? raceInfo.time
      : `${raceInfo.time}Z`
    : "T00:00:00Z";

  return raceInfo.time
    ? `${raceInfo.date}T${normalizedTime.replace(/^T/, "")}`
    : `${raceInfo.date}${normalizedTime}`;
};

const buildOpenF1Url = (
  endpoint: string,
  params: Record<string, string | number | undefined>
): string => {
  const url = new URL(`${OPENF1_BASE_URL}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const fetchOpenF1Data = async <T>(
  url: string,
  errorContext: string
): Promise<T> => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `OpenF1 request failed for ${errorContext} with status ${response.status}`
    );
  }

  return (await response.json()) as T;
};

const resolveOpenF1RaceSession = async (
  raceInfo: ErgastRace,
  season: Season
): Promise<OpenF1Session | null> => {
  const location = raceInfo.Circuit.Location.locality;
  const countryName = raceInfo.Circuit.Location.country;
  const sessionDateTime = Date.parse(normalizeRaceDateTime(raceInfo));
  const sessionDate = raceInfo.date;

  const sessions = await fetchOpenF1Data<OpenF1Session[]>(
    buildOpenF1Url("sessions", {
      session_name: "Race",
      year: Number(season),
      location,
      country_name: countryName,
    }),
    `${season} ${raceInfo.raceName} OpenF1 session lookup`
  );

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return null;
  }

  const activeSessions = sessions.filter((session) => !session.is_cancelled);
  const exactDateMatch = activeSessions.find(
    (session) => session.date_start?.slice(0, 10) === sessionDate
  );

  if (exactDateMatch) {
    return exactDateMatch;
  }

  if (!Number.isNaN(sessionDateTime)) {
    return [...activeSessions].sort((left, right) => {
      const leftDistance = Math.abs(
        Date.parse(left.date_start ?? "") - sessionDateTime
      );
      const rightDistance = Math.abs(
        Date.parse(right.date_start ?? "") - sessionDateTime
      );

      return leftDistance - rightDistance;
    })[0] ?? null;
  }

  return activeSessions[0] ?? null;
};

const getStewardInvestigationStatus = (
  message: string
): StewardInvestigationStatus => {
  if (/under investigation/i.test(message)) return "under-investigation";
  if (/no further investigation/i.test(message)) return "no-further-action";
  if (/penalty/i.test(message)) return "penalty";
  if (/warning|reprimand/i.test(message)) return "warning";
  return "stewards-note";
};

const mapStewardInvestigation = (
  message: OpenF1RaceControlMessage,
  index: number
): StewardInvestigation => ({
  id: `${message.session_key ?? "session"}-${message.date}-${index}`,
  date: message.date,
  lapNumber: message.lap_number ?? null,
  driverNumber: message.driver_number ?? null,
  category: message.category ?? null,
  message: message.message,
  status: getStewardInvestigationStatus(message.message),
});

const fetchCircuitTable = async (
  url: string,
  errorContext: string
): Promise<ErgastCircuit[]> => {
  try {
    const data = await getF1ApiData<CircuitsResponse>(url);
    return data?.MRData?.CircuitTable?.Circuits ?? [];
  } catch (error) {
    console.error(`Error fetching ${errorContext}:`, error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export const getCurrentSeasonRaces = (
  season: Season = DEFAULT_SEASON
): Promise<ErgastRace[]> =>
  fetchRaceTable(seasonRacesUrl(season), `${season} season races`);

export const getRaces = (
  season: Season = DEFAULT_SEASON
): Promise<ErgastRace[]> =>
  fetchRaceTable(seasonRacesUrl(season), `${season} races`);

export const getSprintRaces = (
  season: Season = DEFAULT_SEASON
): Promise<ErgastRace[]> =>
  fetchRaceTable(sprintRacesUrl(season), `${season} sprint races`);

export const getCircuit = async (
  circuitId: string
): Promise<ErgastCircuit | null> => {
  const circuits = await fetchCircuitTable(
    circuitUrl(circuitId),
    `${circuitId} circuit details`
  );
  return circuits[0] ?? null;
};

export const getCircuitRaceWinners = (
  circuitId: string
): Promise<ErgastRace[]> =>
  fetchRaceTable(
    circuitRaceWinnersUrl(circuitId),
    `${circuitId} circuit race winners`
  );

export const getCircuitPodiumFinishers = async (
  circuitId: string
): Promise<ErgastRace[]> => {
  const podiumResults = await Promise.all(
    ([1, 2, 3] as const).map((position) =>
      fetchRaceTable(
        circuitPodiumFinishersUrl(circuitId, position),
        `${circuitId} circuit P${position} finishers`
      )
    )
  );

  return podiumResults.flat();
};

export const getCircuitPoleSitters = (
  circuitId: string
): Promise<ErgastRace[]> =>
  fetchRaceTable(
    circuitPoleSittersUrl(circuitId),
    `${circuitId} circuit pole sitters`
  );

export const getRaceResults = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<RaceResult[]> => {
  const races = await fetchRaceTable(
    raceResultsUrl(round, season),
    `${season} race results`
  );
  return firstRace(races)?.Results ?? [];
};

export const getAllRaceResults = async (
  season: Season = DEFAULT_SEASON
): Promise<RaceWithResults[]> => {
  const races = await fetchRaceTable(seasonRacesUrl(season), "season races");
  return Promise.all(
    races.map(async (race) => ({
      ...race,
      results: await getRaceResults(race.round, season),
    }))
  );
};

export const getRacePitStops = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<PitStop[]> => {
  const races = await fetchRaceTable(
    pitStopsUrl(round, season),
    `${season} race pit stops`
  );
  return firstRace(races)?.PitStops ?? [];
};

export const getRaceLapTimings = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<RaceLap[]> => {
  const races = await fetchRaceTable(
    raceLapTimingsUrl(round, season),
    `${season} race lap timings`
  );
  return firstRace(races)?.Laps ?? [];
};

export const getRaceStewardInvestigations = async (
  raceInfo: ErgastRace,
  season: Season = DEFAULT_SEASON
): Promise<StewardInvestigation[]> => {
  try {
    const session = await resolveOpenF1RaceSession(raceInfo, season);
    if (!session?.session_key) return [];

    const raceControlMessages = await fetchOpenF1Data<OpenF1RaceControlMessage[]>(
      buildOpenF1Url("race_control", { session_key: session.session_key }),
      `${season} ${raceInfo.raceName} steward investigations`
    );

    if (!Array.isArray(raceControlMessages)) return [];

    return raceControlMessages
      .filter((entry) => STEWARD_INVESTIGATION_MESSAGE_REGEX.test(entry.message ?? ""))
      .sort(
        (left, right) =>
          Date.parse(left.date ?? "") - Date.parse(right.date ?? "")
      )
      .map(mapStewardInvestigation);
  } catch (error) {
    console.error(
      `Error fetching ${season} ${raceInfo.raceName} steward investigations:`,
      error
    );
    throw error;
  }
};

export const getDriverRaceResults = async (
  driverId: string,
  season: Season = DEFAULT_SEASON
): Promise<RaceResult[]> => {
  const races = await fetchRaceTable(
    driverRaceResultsUrl(driverId, season),
    `${season} ${driverId} race results`
  );
  return races.flatMap((race) =>
    (race.Results ?? []).map((result) => ({
      ...result,
      season: race.season,
      round: race.round,
      raceName: race.raceName,
      date: race.date,
    }))
  );
};

export const getConstructorRaceResults = async (
  constructorId: string,
  season: Season = DEFAULT_SEASON
): Promise<RaceResult[]> => {
  const races = await fetchRaceTable(
    constructorRaceResultsUrl(constructorId, season),
    `${season} ${constructorId} constructor race results`
  );
  return races.flatMap((race) => race.Results ?? []);
};

export const getSprintResults = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<SprintResult[]> => {
  const races = await fetchRaceTable(
    sprintResultsUrl(round, season),
    `${season} sprint results`
  );
  return firstRace(races)?.SprintResults ?? [];
};

export const getAllSprintResults = async (
  season: Season = DEFAULT_SEASON
): Promise<SprintRaceWithResults[]> => {
  const sprintRaces = await getSprintRaces(season);
  return Promise.all(
    sprintRaces.map(async (race) => ({
      ...race,
      results: await getSprintResults(race.round, season),
    }))
  );
};

export const getQualifyingResults = async (
  round: string | number,
  season: Season = DEFAULT_SEASON
): Promise<QualifyingResult[]> => {
  const races = await fetchRaceTable(
    qualifyingResultsUrl(round, season),
    `${season} qualifying results`
  );
  return firstRace(races)?.QualifyingResults ?? [];
};

export const getAllQualifyingResults = async (
  season: Season = DEFAULT_SEASON
): Promise<QualifyingRaceWithResults[]> => {
  const races = await fetchRaceTable(seasonRacesUrl(season), "season races");
  return Promise.all(
    races.map(async (race) => ({
      ...race,
      results: await getQualifyingResults(race.round, season),
    }))
  );
};

export const getLastRaceResults = async (
  season: Season = DEFAULT_SEASON
): Promise<RaceResult[]> => {
  const races = await fetchRaceTable(
    lastResultsUrl(season),
    `${season} last race results`
  );
  return firstRace(races)?.Results ?? [];
};

export const getRaceInfo = async (
  season: Season = DEFAULT_SEASON
): Promise<ErgastRace | undefined> => {
  const races = await fetchRaceTable(
    lastResultsUrl(season),
    `${season} last race info`
  );
  return firstRace(races);
};
