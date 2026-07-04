import type {
  QualifyingRaceWithResults,
  QualifyingResult,
} from "../../services/api/racesApi";

const chartPalette = [
  "#e10600",
  "#1e88e5",
  "#43a047",
  "#fb8c00",
  "#8e24aa",
  "#00acc1",
  "#fdd835",
  "#6d4c41",
  "#3949ab",
  "#d81b60",
];

export interface DriverQualifyingPerformance {
  driverId: string;
  driverName: string;
  familyName: string;
  constructorName: string;
  appearances: number;
  averagePosition: number;
  bestPosition: number;
  worstPosition: number;
  poles: number;
  q3Appearances: number;
  q3Rate: number;
  color: string;
}

interface DriverQualifyingAccumulator {
  driverId: string;
  driverName: string;
  familyName: string;
  constructorName: string;
  appearances: number;
  totalPosition: number;
  bestPosition: number;
  worstPosition: number;
  poles: number;
  q3Appearances: number;
}

const parseQualifyingPosition = (value: string | undefined): number | null => {
  const position = Number.parseInt(value ?? "", 10);
  return Number.isFinite(position) && position > 0 ? position : null;
};

export const formatAveragePosition = (
  position: number,
  language = "en"
): string => {
  const hasFraction = !Number.isInteger(position);

  return `P${new Intl.NumberFormat(language, {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(position)}`;
};

const getDriverName = (result: QualifyingResult): string =>
  `${result.Driver.givenName} ${result.Driver.familyName}`.trim();

export const buildQualifyingPerformance = (
  qualifyings: readonly QualifyingRaceWithResults[]
): DriverQualifyingPerformance[] => {
  const byDriver = new Map<string, DriverQualifyingAccumulator>();

  qualifyings.forEach((quali) => {
    quali.results.forEach((result) => {
      const position = parseQualifyingPosition(result.position);
      if (position === null) {
        return;
      }

      const driverId = result.Driver.driverId;
      const current = byDriver.get(driverId) ?? {
        driverId,
        driverName: getDriverName(result),
        familyName: result.Driver.familyName,
        constructorName: result.Constructor.name,
        appearances: 0,
        totalPosition: 0,
        bestPosition: position,
        worstPosition: position,
        poles: 0,
        q3Appearances: 0,
      };

      current.appearances += 1;
      current.totalPosition += position;
      current.bestPosition = Math.min(current.bestPosition, position);
      current.worstPosition = Math.max(current.worstPosition, position);
      current.poles += position === 1 ? 1 : 0;
      current.q3Appearances += result.Q3 ? 1 : 0;
      current.constructorName = result.Constructor.name;
      byDriver.set(driverId, current);
    });
  });

  return [...byDriver.values()]
    .map((driver) => ({
      driverId: driver.driverId,
      driverName: driver.driverName,
      familyName: driver.familyName,
      constructorName: driver.constructorName,
      appearances: driver.appearances,
      averagePosition: driver.totalPosition / driver.appearances,
      bestPosition: driver.bestPosition,
      worstPosition: driver.worstPosition,
      poles: driver.poles,
      q3Appearances: driver.q3Appearances,
      q3Rate: driver.q3Appearances / driver.appearances,
      color: chartPalette[0],
    }))
    .sort((left, right) => {
      const averageGap = left.averagePosition - right.averagePosition;
      if (averageGap !== 0) {
        return averageGap;
      }

      const poleGap = right.poles - left.poles;
      if (poleGap !== 0) {
        return poleGap;
      }

      return left.driverName.localeCompare(right.driverName);
    })
    .map((driver, index) => ({
      ...driver,
      color: chartPalette[index % chartPalette.length],
    }));
};
