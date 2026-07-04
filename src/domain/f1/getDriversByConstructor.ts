import { getF1ApiData } from "../../services/api/axios";
import type {
  DriverStanding,
  DriverStandingsResponse,
} from "../../services/api/constructorsApi";
import { DEFAULT_SEASON, type Season } from "./seasons";

const driversApi = (season: Season): string =>
  `/${season}/driverStandings.json`;

const getDriversByConstructor = async (
  constructorId: string,
  season: Season = DEFAULT_SEASON
): Promise<DriverStanding[]> => {
  try {
    const data = await getF1ApiData<DriverStandingsResponse>(
      driversApi(season)
    );
    const drivers =
      data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
    // Filtrar los pilotos por constructorId
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

export default getDriversByConstructor;
