import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import ImageWithFallback from "../../components/ImageWithFallback/ImageWithFallback";
import EmptyState from "../../components/EmptyState/EmptyState";
import { getDriverImage } from "../../domain/f1/driversImage";
import { getPermanentNumberImage } from "../../domain/f1/permanentNumber";
import nationalityToCountryCode from "../../domain/f1/images";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import { getDriverHelmet } from "../../domain/f1/helmets";
import Flag from "react-world-flags";
import driversBio from "../../domain/f1/driversBio";
import {
  readFavoriteDrivers,
  saveFavoriteDrivers,
} from "../../app/favoriteDrivers";

import useFavicon from "../../hooks/useFavicon";
import {
  useAllQualifyingResults,
  useDriverCrossSeasonComparison,
  useDriverRaceResults,
  useDriverStandings,
  useDriverStandingsTimeline,
} from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import type { DriverStanding } from "../../services/api/constructorsApi";
import type { DriverCrossSeasonSnapshot } from "../../hooks/queries";
import type { DriverStandingsTimelineRound } from "../../services/api/testapi";
import type {
  QualifyingRaceWithResults,
  QualifyingResult,
  RaceResult,
} from "../../services/api/racesApi";

const driversBioMap = driversBio as Record<string, string | undefined>;
const nationalityMap = nationalityToCountryCode as Record<
  string,
  string | undefined
>;
const driverProfileCardBaseClass =
  "rounded-2xl bg-(--background-buttons) shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition-[transform,box-shadow] duration-300";
const driverTrendCardClass =
  "rounded-2xl bg-(--background-buttons) shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5";
const driverProfileSkeletonBlockClass =
  "animate-pulse motion-reduce:animate-none rounded-[1.25rem] bg-(--background-color2) opacity-70";

const parseNumber = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => value.toLocaleString("en-US", options);

const formatRaceDate = (date: string | undefined): string => {
  if (!date) {
    return "Date unavailable";
  }

  const raceDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(raceDate.getTime())) {
    return date;
  }

  return raceDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface DriverSeasonFormPoint {
  round: string;
  raceName: string;
  date?: string;
  finishPosition: number;
  qualifyingPosition?: number;
  qualifyingTime?: string;
  points: number;
  status?: string;
}

interface DriverCareerTimelineItem {
  id: string;
  marker: string;
  label: string;
  title: string;
  description: string;
  dateLabel?: string;
  detail?: string;
}

interface DriverStandingSnapshot {
  round: string;
  raceName: string;
  date?: string;
  position: number;
  points: number;
  wins: number;
}

interface DriverBestFinish {
  position: number;
  raceName?: string;
}

interface DriverStrengthMetric {
  id: string;
  label: string;
  description: string;
  value: number;
  displayValue: string;
}

interface DriverCrossSeasonComparisonRow {
  season: string;
  championshipPosition: number | null;
  points: number;
  wins: number;
  podiums: number;
  raceStarts: number;
  averageFinish: number | null;
  averageQualifying: number | null;
  bestFinish: number | null;
  bestQualifying: number | null;
  constructorName?: string;
}

type DriverPerformanceMetric = "race" | "qualifying";

const performanceMetricOptions: Array<{
  value: DriverPerformanceMetric;
  label: string;
  description: string;
  chartLabel: string;
}> = [
  {
    value: "race",
    label: "Race",
    description: "Finish position",
    chartLabel: "race finish",
  },
  {
    value: "qualifying",
    label: "Qualifying",
    description: "Grid pace",
    chartLabel: "qualifying position",
  },
];

const parsePosition = (value: string | undefined): number | null => {
  const position = Number.parseInt(value ?? "", 10);
  return Number.isFinite(position) && position > 0 ? position : null;
};

const getAveragePosition = (positions: Array<number | null>): number | null => {
  const parsedPositions = positions.filter(
    (position): position is number => position !== null
  );

  if (parsedPositions.length === 0) {
    return null;
  }

  return (
    parsedPositions.reduce((total, position) => total + position, 0) /
    parsedPositions.length
  );
};

const clampScore = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const scorePositionAverage = (averagePosition: number | null): number | null =>
  averagePosition === null
    ? null
    : clampScore(((21 - averagePosition) / 20) * 100);

const getStandardDeviation = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  const average =
    values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
};

const formatSignedNumber = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

const getBestQualifyingTime = (
  qualifyingResult: QualifyingResult | undefined
): string | undefined =>
  qualifyingResult?.Q3 ?? qualifyingResult?.Q2 ?? qualifyingResult?.Q1;

const getDriverBestFinish = (
  results: RaceResult[]
): DriverBestFinish | null => {
  const bestResult = results.reduce<DriverBestFinish | null>((best, result) => {
    const position = parsePosition(result.position);

    if (position === null || (best && position >= best.position)) {
      return best;
    }

    return {
      position,
      raceName: result.raceName,
    };
  }, null);

  return bestResult;
};

const getBestPosition = (positions: Array<number | null>): number | null => {
  const validPositions = positions.filter(
    (position): position is number => position !== null
  );

  if (validPositions.length === 0) {
    return null;
  }

  return Math.min(...validPositions);
};

const buildDriverCrossSeasonComparison = ({
  seasons,
  driverId,
}: {
  seasons: DriverCrossSeasonSnapshot[];
  driverId: string | undefined;
}): DriverCrossSeasonComparisonRow[] =>
  seasons
    .map((season) => {
      const seasonFormPoints = buildDriverSeasonForm(
        season.raceResults,
        season.qualifyingResults,
        driverId
      );
      const finishPositions = seasonFormPoints.map((point) => point.finishPosition);
      const qualifyingPositions = seasonFormPoints.map(
        (point) => point.qualifyingPosition ?? null
      );
      const championshipPosition = parsePosition(season.standing?.position);
      const points = season.standing
        ? parseNumber(season.standing.points)
        : seasonFormPoints.reduce((total, point) => total + point.points, 0);
      const wins = season.standing?.wins
        ? parseNumber(season.standing.wins)
        : season.raceResults.filter((result) => parsePosition(result.position) === 1)
            .length;

      return {
        season: season.season,
        championshipPosition,
        points,
        wins,
        podiums: season.raceResults.filter((result) => {
          const position = parsePosition(result.position);
          return position !== null && position <= 3;
        }).length,
        raceStarts: season.raceResults.length,
        averageFinish: getAveragePosition(finishPositions),
        averageQualifying: getAveragePosition(qualifyingPositions),
        bestFinish: getBestPosition(finishPositions),
        bestQualifying: getBestPosition(qualifyingPositions),
        constructorName:
          season.standing?.Constructors?.[0]?.name ??
          season.raceResults[0]?.Constructor?.name,
      };
    })
    .filter(
      (season) =>
        season.raceStarts > 0 ||
        season.points > 0 ||
        season.championshipPosition !== null
    );

const buildDriverStrengthMetrics = ({
  driver,
  raceResults,
  seasonFormPoints,
  averageFinishPosition,
  averageQualifyingPosition,
}: {
  driver: DriverStanding | undefined;
  raceResults: RaceResult[];
  seasonFormPoints: DriverSeasonFormPoint[];
  averageFinishPosition: number | null;
  averageQualifyingPosition: number | null;
}): DriverStrengthMetric[] => {
  if (!driver) {
    return [];
  }

  const raceStarts = Math.max(raceResults.length, seasonFormPoints.length);
  const finishPositions = seasonFormPoints.map((point) => point.finishPosition);
  const qualifyingPairs = seasonFormPoints.filter(
    (point) => point.qualifyingPosition !== undefined
  );
  const metrics: DriverStrengthMetric[] = [];
  const racePaceScore = scorePositionAverage(averageFinishPosition);
  const qualifyingPaceScore = scorePositionAverage(averageQualifyingPosition);

  if (racePaceScore !== null && averageFinishPosition !== null) {
    metrics.push({
      id: "race-pace",
      label: "Race pace",
      description: "Average classified finish normalized to a 20-car field.",
      value: racePaceScore,
      displayValue: `Avg P${averageFinishPosition.toFixed(1)}`,
    });
  }

  if (qualifyingPaceScore !== null && averageQualifyingPosition !== null) {
    metrics.push({
      id: "qualifying-pace",
      label: "Qualifying",
      description: "Average qualifying position normalized to a 20-car field.",
      value: qualifyingPaceScore,
      displayValue: `Avg P${averageQualifyingPosition.toFixed(1)}`,
    });
  }

  if (raceStarts > 0) {
    const pointsPerStart = parseNumber(driver.points) / raceStarts;
    const winRate = parseNumber(driver.wins) / raceStarts;

    metrics.push({
      id: "points-yield",
      label: "Points yield",
      description:
        "Points per start scored against a 25-point race-win baseline.",
      value: clampScore((pointsPerStart / 25) * 100),
      displayValue: `${pointsPerStart.toFixed(1)} pts/start`,
    });

    metrics.push({
      id: "win-rate",
      label: "Win rate",
      description: "Share of starts converted into grand prix victories.",
      value: clampScore(winRate * 100),
      displayValue: `${formatNumber(winRate * 100, {
        maximumFractionDigits: 0,
      })}% wins`,
    });
  }

  const finishDeviation = getStandardDeviation(finishPositions);
  if (finishDeviation !== null) {
    metrics.push({
      id: "consistency",
      label: "Consistency",
      description: "Rewards low finish-position variance across the season.",
      value: clampScore(100 - finishDeviation * 15),
      displayValue:
        finishPositions.length === 1
          ? "Single finish"
          : `${finishDeviation.toFixed(1)} pos σ`,
    });
  }

  if (qualifyingPairs.length > 0) {
    const averagePositionsGained =
      qualifyingPairs.reduce(
        (total, point) =>
          total +
          (point.qualifyingPosition ?? point.finishPosition) -
          point.finishPosition,
        0
      ) / qualifyingPairs.length;

    metrics.push({
      id: "racecraft",
      label: "Racecraft",
      description: "Average race-position gain from qualifying to finish.",
      value: clampScore(50 + averagePositionsGained * 10),
      displayValue: `${formatSignedNumber(averagePositionsGained)} positions`,
    });
  }

  return metrics;
};

const buildDriverSeasonForm = (
  results: RaceResult[],
  qualifyingRaces: QualifyingRaceWithResults[],
  driverId: string | undefined
): DriverSeasonFormPoint[] => {
  const qualifyingByRound = new Map<
    string,
    { position: number; bestTime?: string }
  >();

  if (driverId) {
    qualifyingRaces.forEach((race) => {
      const qualifyingResult = race.results.find(
        (result) => result.Driver.driverId === driverId
      );
      const position = parsePosition(qualifyingResult?.position);

      if (position !== null) {
        qualifyingByRound.set(race.round, {
          position,
          bestTime: getBestQualifyingTime(qualifyingResult),
        });
      }
    });
  }

  return results
    .map((result, index): DriverSeasonFormPoint | null => {
      const finishPosition = parsePosition(result.position);
      if (finishPosition === null) {
        return null;
      }

      const round = result.round ?? `${index + 1}`;
      const qualifying = qualifyingByRound.get(round);
      return {
        round,
        raceName: result.raceName ?? `Round ${round}`,
        date: result.date,
        finishPosition,
        qualifyingPosition: qualifying?.position,
        qualifyingTime: qualifying?.bestTime,
        points: parseNumber(result.points),
        status: result.status,
      };
    })
    .filter((point): point is DriverSeasonFormPoint => point !== null);
};

const getYearLabel = (date: string | undefined, fallback: string): string => {
  if (!date) {
    return fallback;
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsedDate.getTime())
    ? fallback
    : `${parsedDate.getUTCFullYear()}`;
};

const getDriverStandingSnapshots = (
  driverId: string,
  standingsTimeline: DriverStandingsTimelineRound[]
): DriverStandingSnapshot[] =>
  standingsTimeline.flatMap((round) => {
    const standing = round.DriverStandings.find(
      (driverStanding) => driverStanding.Driver.driverId === driverId
    );
    const position = parsePosition(standing?.position);

    if (!standing || position === null) {
      return [];
    }

    return [
      {
        round: round.round,
        raceName: round.raceName,
        date: round.date,
        position,
        points: parseNumber(standing.points),
        wins: parseNumber(standing.wins),
      },
    ];
  });

const buildDriverCareerTimeline = ({
  driver,
  raceResults,
  standingsTimeline,
  selectedSeason,
}: {
  driver: DriverStanding | undefined;
  raceResults: RaceResult[];
  standingsTimeline: DriverStandingsTimelineRound[];
  selectedSeason: string;
}): DriverCareerTimelineItem[] => {
  if (!driver) {
    return [];
  }

  const { Driver } = driver;
  const driverName = `${Driver.givenName} ${Driver.familyName}`;
  const snapshots = getDriverStandingSnapshots(
    Driver.driverId,
    standingsTimeline
  );
  const firstRace = raceResults[0];
  const winningRace = raceResults.find(
    (result) => parsePosition(result.position) === 1
  );
  const bestResult = raceResults.reduce<RaceResult | undefined>(
    (best, result) => {
      const resultPosition = parsePosition(result.position);
      const bestPosition = parsePosition(best?.position);

      if (resultPosition === null) {
        return best;
      }

      return bestPosition === null || resultPosition < bestPosition
        ? result
        : best;
    },
    undefined
  );
  const peakSnapshot = snapshots.reduce<DriverStandingSnapshot | undefined>(
    (best, snapshot) =>
      !best || snapshot.position < best.position ? snapshot : best,
    undefined
  );
  const latestSnapshot = snapshots[snapshots.length - 1];
  const resultMilestone = winningRace ?? bestResult;
  const resultPosition = parsePosition(resultMilestone?.position);
  const timelineItems: DriverCareerTimelineItem[] = [];

  if (Driver.dateOfBirth) {
    timelineItems.push({
      id: "origin",
      marker: getYearLabel(Driver.dateOfBirth, "Start"),
      label: "Origin",
      title: `${driverName} is born`,
      description: Driver.nationality
        ? `The ${Driver.nationality} driver's story starts before the racing milestones that follow.`
        : "The driver's story starts before the racing milestones that follow.",
      dateLabel: formatRaceDate(Driver.dateOfBirth),
      detail: Driver.nationality,
    });
  }

  if (firstRace) {
    timelineItems.push({
      id: "season-opener",
      marker: `R${firstRace.round ?? "1"}`,
      label: "Season start",
      title: `Opened ${selectedSeason} at ${firstRace.raceName ?? "the first race"}`,
      description: `Finished P${firstRace.position} with ${formatNumber(
        parseNumber(firstRace.points),
        { maximumFractionDigits: 1 }
      )} points${firstRace.Constructor?.name ? ` for ${firstRace.Constructor.name}` : ""}.`,
      dateLabel: formatRaceDate(firstRace.date),
      detail: firstRace.status,
    });
  }

  if (resultMilestone && resultPosition !== null) {
    timelineItems.push({
      id: winningRace ? "first-win" : "best-finish",
      marker: winningRace ? "WIN" : `P${resultPosition}`,
      label: winningRace ? "Win milestone" : "Best result",
      title: winningRace
        ? `First ${selectedSeason} win at ${resultMilestone.raceName ?? "a race"}`
        : `Best ${selectedSeason} finish: P${resultPosition}`,
      description: `Scored ${formatNumber(parseNumber(resultMilestone.points), {
        maximumFractionDigits: 1,
      })} points in a key step of the campaign.`,
      dateLabel: formatRaceDate(resultMilestone.date),
      detail: resultMilestone.raceName,
    });
  }

  if (peakSnapshot) {
    timelineItems.push({
      id: "peak-ranking",
      marker: `P${peakSnapshot.position}`,
      label: "Peak ranking",
      title: `Peaked at championship P${peakSnapshot.position}`,
      description: `Reached ${formatNumber(peakSnapshot.points, {
        maximumFractionDigits: 1,
      })} points after ${peakSnapshot.raceName}.`,
      dateLabel: formatRaceDate(peakSnapshot.date),
      detail: `Round ${peakSnapshot.round}`,
    });
  }

  timelineItems.push({
    id: "current-standing",
    marker: `P${driver.position ?? "—"}`,
    label: "Current standing",
    title: `Current standing: P${driver.position ?? "—"}`,
    description: `${formatNumber(parseNumber(driver.points), {
      maximumFractionDigits: 1,
    })} points and ${formatNumber(parseNumber(driver.wins))} wins in ${selectedSeason}.`,
    dateLabel: latestSnapshot
      ? formatRaceDate(latestSnapshot.date)
      : selectedSeason,
    detail: latestSnapshot ? `Latest: ${latestSnapshot.raceName}` : undefined,
  });

  return timelineItems;
};

function DriverCareerTimeline({
  items,
  driverName,
  selectedSeason,
  isLoading,
  isError,
}: {
  items: DriverCareerTimelineItem[];
  driverName: string;
  selectedSeason: string;
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const emptyMessage = isError
    ? "Career timeline data is unavailable for this driver right now."
    : "Career timeline milestones are unavailable for this driver right now.";

  return (
    <section
      className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="driver-career-timeline-title"
    >
      <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            Career path
          </p>
          <h2
            id="driver-career-timeline-title"
            className="mt-2 font-['F1_Bold'] text-2xl"
          >
            Career timeline
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          Key milestones for {driverName}, pairing background details with{" "}
          {selectedSeason} results and championship progression.
        </p>
      </div>

      {isLoading && items.length === 0 ? (
        <p className="mt-5 text-sm text-(--text-color3)">
          Loading career timeline milestones…
        </p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-(--text-color3)">{emptyMessage}</p>
      ) : (
        <ol className="relative mt-6 grid gap-4 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-px before:bg-(--background-color2) min-[900px]:grid-cols-5 min-[900px]:before:top-5 min-[900px]:before:left-4 min-[900px]:before:right-4 min-[900px]:before:h-px min-[900px]:before:w-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="relative rounded-3xl border border-(--background-color2) bg-(--background-color) p-4 pl-16 min-[900px]:pt-14 min-[900px]:pl-4"
            >
              <span className="absolute top-3 left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-(--color3) text-center font-['F1_Bold'] text-xs text-white ring-4 ring-(--background-buttons) min-[900px]:left-4">
                {item.marker}
              </span>
              <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.16em] text-(--text-color3)">
                {item.label}
              </p>
              <h3 className="mt-2 font-['F1_Bold'] text-base text-(--text-color)">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-(--text-color2)">
                {item.description}
              </p>
              {(item.dateLabel || item.detail) && (
                <p className="mt-3 text-xs font-['F1_Bold'] uppercase tracking-[0.12em] text-(--color3)">
                  {[item.dateLabel, item.detail].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DriverSeasonFormChart({
  points,
  driverName,
  isLoading,
  isError,
}: {
  points: DriverSeasonFormPoint[];
  driverName: string;
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedMetric, setSelectedMetric] =
    useState<DriverPerformanceMetric>("race");
  const hasQualifyingData = points.some(
    (point) => point.qualifyingPosition !== undefined
  );
  const activeMetric: DriverPerformanceMetric =
    selectedMetric === "qualifying" && !hasQualifyingData
      ? "race"
      : selectedMetric;
  const statLabelClass =
    "font-['F1_Regular'] text-xs uppercase tracking-[0.15em] text-(--text-color3)";

  if (isLoading) {
    return (
      <section
        className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="driver-season-form-title"
      >
        <h2 id="driver-season-form-title" className="font-['F1_Bold'] text-2xl">
          Performance trend
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Loading race-by-race season form…
        </p>
      </section>
    );
  }

  if (isError || points.length === 0) {
    return (
      <section
        className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="driver-season-form-title"
      >
        <h2 id="driver-season-form-title" className="font-['F1_Bold'] text-2xl">
          Performance trend
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Race-by-race form data is unavailable for this season right now.
        </p>
      </section>
    );
  }

  const width = 760;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 58, left: 58 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const activeMetricOption = performanceMetricOptions.find(
    (option) => option.value === activeMetric
  );
  const chartPoints = points.reduce<
    Array<{ index: number; point: DriverSeasonFormPoint; position: number }>
  >((metricPoints, point, index) => {
    const position =
      activeMetric === "race" ? point.finishPosition : point.qualifyingPosition;

    if (position !== undefined) {
      metricPoints.push({ index, point, position });
    }

    return metricPoints;
  }, []);
  const plottedPositions = chartPoints.map((chartPoint) => chartPoint.position);
  const maxPosition = Math.max(1, ...plottedPositions);
  const yTicks = Array.from(
    new Set([1, Math.ceil(maxPosition / 2), maxPosition])
  );
  const getX = (index: number): number =>
    points.length === 1
      ? padding.left + innerWidth / 2
      : padding.left + (index / (points.length - 1)) * innerWidth;
  const getY = (position: number): number =>
    maxPosition === 1
      ? padding.top + innerHeight / 2
      : padding.top + ((position - 1) / (maxPosition - 1)) * innerHeight;
  const line = chartPoints
    .map(
      (chartPoint) => `${getX(chartPoint.index)},${getY(chartPoint.position)}`
    )
    .join(" ");
  const activeChartPoint =
    chartPoints.find((chartPoint) => chartPoint.index === activeIndex) ??
    chartPoints[chartPoints.length - 1];
  const activePoint = activeChartPoint?.point;
  const activePosition = activeChartPoint?.position;
  const activeX = activeChartPoint ? getX(activeChartPoint.index) : null;
  const chartColor =
    activeMetric === "race" ? "var(--color3)" : "var(--text-color2)";
  const labelInterval = Math.max(1, Math.ceil(points.length / 8));

  return (
    <section
      className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="driver-season-form-title"
    >
      <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            Season form
          </p>
          <h2
            id="driver-season-form-title"
            className="mt-2 font-['F1_Bold'] text-2xl"
          >
            Performance trend
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          Switch between race finish and qualifying position by round to see
          whether {driverName}&apos;s pace is trending toward the front. Lower
          is better.
        </p>
      </div>

      <div className="flex flex-col gap-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <div
          className="inline-flex w-fit rounded-full bg-(--background-color) p-1 font-['F1_Bold'] text-sm"
          role="group"
          aria-label="Driver performance chart data"
        >
          {performanceMetricOptions.map((option) => {
            const isActive = option.value === activeMetric;
            const isDisabled =
              option.value === "qualifying" && !hasQualifyingData;

            return (
              <button
                key={option.value}
                type="button"
                className={`rounded-full px-4 py-2 transition-colors ${
                  isActive
                    ? "bg-(--color3) text-white"
                    : "text-(--text-color2) hover:bg-(--background-color2) disabled:cursor-not-allowed disabled:opacity-45"
                }`}
                aria-pressed={isActive}
                disabled={isDisabled}
                onClick={() => {
                  setSelectedMetric(option.value);
                  setActiveIndex(null);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-['F1_Bold'] text-(--text-color2)">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              activeMetric === "race" ? "bg-(--color3)" : "bg-(--text-color2)"
            }`}
            aria-hidden="true"
          />
          Showing {activeMetricOption?.description ?? "position"}
        </span>
        {!hasQualifyingData && (
          <span className="text-sm text-(--text-color3)">
            Qualifying data is unavailable for this driver.
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl bg-(--background-color) p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${driverName} ${
            activeMetricOption?.chartLabel ?? "performance"
          } trend by round`}
          className="min-w-3xl"
          onMouseLeave={() => setActiveIndex(null)}
        >
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--background-color2)"
                  strokeDasharray="4 6"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-(--text-color3) text-[11px] font-['F1_Regular']"
                >
                  P{tick}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="var(--background-color2)"
          />
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={height - padding.bottom}
            y2={height - padding.bottom}
            stroke="var(--background-color2)"
          />
          {activeX !== null && (
            <line
              x1={activeX}
              x2={activeX}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="var(--text-color3)"
              strokeDasharray="5 5"
            />
          )}
          <polyline
            points={line}
            fill="none"
            stroke={chartColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chartPoints.map(({ point, index, position }) => (
            <circle
              key={`${point.round}-${activeMetric}-${position}`}
              cx={getX(index)}
              cy={getY(position)}
              r={activeIndex === index ? 5.5 : 4}
              fill={chartColor}
              stroke="var(--background-buttons)"
              strokeWidth="2"
              role="button"
              tabIndex={0}
              aria-label={
                activeMetric === "race"
                  ? `Round ${point.round}, ${point.raceName}: finished P${position}, ${formatNumber(point.points)} points`
                  : `Round ${point.round}, ${point.raceName}: qualified P${position}, finished P${point.finishPosition}`
              }
              className="cursor-pointer outline-none transition-all focus-visible:stroke-(--text-color)"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            />
          ))}
          {points.map((point, index) =>
            index % labelInterval === 0 || index === points.length - 1 ? (
              <text
                key={point.round}
                x={getX(index)}
                y={height - padding.bottom + 28}
                textAnchor="middle"
                className="fill-(--text-color3) text-[11px] font-['F1_Regular']"
              >
                R{point.round}
              </text>
            ) : null
          )}
        </svg>
      </div>

      {activePoint && (
        <dl
          className="mt-4 grid gap-3 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4 min-[720px]:grid-cols-6"
          aria-live="polite"
        >
          <div>
            <dt className={statLabelClass}>Selected round</dt>
            <dd className="mt-2 font-['F1_Bold'] text-(--text-color)">
              R{activePoint.round} · {activePoint.raceName}
            </dd>
            <dd className="mt-1 text-sm text-(--text-color3)">
              {formatRaceDate(activePoint.date)}
            </dd>
          </div>
          <div>
            <dt className={statLabelClass}>Finish</dt>
            <dd className="mt-2 font-['F1_Bold'] text-xl text-(--color3)">
              P{activePoint.finishPosition}
            </dd>
          </div>
          <div>
            <dt className={statLabelClass}>Qualifying</dt>
            <dd className="mt-2 font-['F1_Bold'] text-xl text-(--text-color2)">
              {activePoint.qualifyingPosition
                ? `P${activePoint.qualifyingPosition}`
                : "—"}
            </dd>
            {activePoint.qualifyingTime && (
              <dd className="mt-1 text-sm text-(--text-color3)">
                Best lap: {activePoint.qualifyingTime}
              </dd>
            )}
          </div>
          <div>
            <dt className={statLabelClass}>Showing</dt>
            <dd className="mt-2 font-['F1_Bold'] text-xl text-(--text-color)">
              {activePosition ? `P${activePosition}` : "—"}
            </dd>
            <dd className="mt-1 text-sm text-(--text-color3)">
              {activeMetricOption?.description ?? "Selected metric"}
            </dd>
          </div>
          <div>
            <dt className={statLabelClass}>Points scored</dt>
            <dd className="mt-2 font-['F1_Bold'] text-xl text-(--color3)">
              {formatNumber(activePoint.points, { maximumFractionDigits: 1 })}{" "}
              pts
            </dd>
          </div>
          <div>
            <dt className={statLabelClass}>Status</dt>
            <dd className="mt-2 text-sm font-bold text-(--text-color2)">
              {activePoint.status ?? "Status unavailable"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function DriverStrengthsRadarChart({
  metrics,
  driverName,
  selectedSeason,
  isLoading,
  isError,
}: {
  metrics: DriverStrengthMetric[];
  driverName: string;
  selectedSeason: string;
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  if (isLoading) {
    return (
      <section
        className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="driver-strengths-title"
      >
        <h2 id="driver-strengths-title" className="font-['F1_Bold'] text-2xl">
          Driver strengths
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Loading statistical strength profile…
        </p>
      </section>
    );
  }

  if (isError || metrics.length < 3) {
    return (
      <section
        className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="driver-strengths-title"
      >
        <h2 id="driver-strengths-title" className="font-['F1_Bold'] text-2xl">
          Driver strengths
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Strength radar data is unavailable for this driver right now.
        </p>
      </section>
    );
  }

  const width = 430;
  const height = 430;
  const center = { x: width / 2, y: height / 2 };
  const radius = 138;
  const levels = [0.25, 0.5, 0.75, 1];
  const getPoint = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index / metrics.length) * Math.PI * 2;
    const distance = radius * (value / 100);

    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  };
  const toPoints = (value: number): string =>
    metrics
      .map((_, index) => {
        const point = getPoint(index, value);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  const radarPoints = metrics
    .map((metric, index) => {
      const point = getPoint(index, metric.value);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const strongestMetric = metrics.reduce((strongest, metric) =>
    metric.value > strongest.value ? metric : strongest
  );
  const developmentMetric = metrics.reduce((lowest, metric) =>
    metric.value < lowest.value ? metric : lowest
  );

  return (
    <section
      className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="driver-strengths-title"
    >
      <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            Statistical radar
          </p>
          <h2
            id="driver-strengths-title"
            className="mt-2 font-['F1_Bold'] text-2xl"
          >
            Driver strengths
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          Scores normalize {selectedSeason} race, qualifying, points and win
          data to a 0–100 scale so strengths are easy to compare at a glance.
        </p>
      </div>

      <div className="mt-5 grid gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] min-[900px]:items-center">
        <div className="overflow-x-auto rounded-3xl bg-(--background-color) p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${driverName} ${selectedSeason} driver strengths radar chart`}
            className="mx-auto min-w-90 max-w-full"
          >
            {levels.map((level) => (
              <polygon
                key={level}
                points={toPoints(level * 100)}
                fill="none"
                stroke="var(--background-color2)"
                strokeDasharray={level === 1 ? undefined : "4 6"}
              />
            ))}
            {metrics.map((metric, index) => {
              const outerPoint = getPoint(index, 100);
              const labelPoint = getPoint(index, 116);

              return (
                <g key={metric.id}>
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={outerPoint.x}
                    y2={outerPoint.y}
                    stroke="var(--background-color2)"
                  />
                  <text
                    x={labelPoint.x}
                    y={labelPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-(--text-color2) text-[11px] font-['F1_Bold']"
                  >
                    {metric.label}
                  </text>
                </g>
              );
            })}
            <polygon
              points={radarPoints}
              fill="var(--color3)"
              fillOpacity="0.24"
              stroke="var(--color3)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {metrics.map((metric, index) => {
              const point = getPoint(index, metric.value);

              return (
                <circle
                  key={`${metric.id}-point`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="var(--color3)"
                  stroke="var(--background-buttons)"
                  strokeWidth="2"
                  aria-label={`${metric.label}: ${metric.value} out of 100`}
                />
              );
            })}
            <text
              x={center.x}
              y={center.y + 4}
              textAnchor="middle"
              className="fill-(--text-color3) text-[12px] font-['F1_Bold']"
            >
              0–100
            </text>
          </svg>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
            <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.18em] text-(--text-color3)">
              Profile readout
            </p>
            <p className="mt-3 text-sm leading-6 text-(--text-color2)">
              Strongest: <strong>{strongestMetric.label}</strong> at{" "}
              {strongestMetric.value}/100. Watch area:{" "}
              <strong>{developmentMetric.label}</strong> at{" "}
              {developmentMetric.value}
              /100.
            </p>
          </div>
          <dl className="grid gap-3 min-[520px]:grid-cols-2 min-[900px]:grid-cols-1 min-[1120px]:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4"
              >
                <dt className="flex items-center justify-between gap-3 font-['F1_Bold'] text-sm text-(--text-color)">
                  <span>{metric.label}</span>
                  <span className="text-(--color3)">{metric.value}/100</span>
                </dt>
                <dd className="mt-2 text-xs font-['F1_Bold'] uppercase tracking-[0.12em] text-(--text-color3)">
                  {metric.displayValue}
                </dd>
                <dd className="mt-2 text-xs leading-5 text-(--text-color3)">
                  {metric.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function DriverCrossSeasonComparison({
  seasons,
  driverName,
  selectedSeason,
  isLoading,
  isError,
}: {
  seasons: DriverCrossSeasonComparisonRow[];
  driverName: string;
  selectedSeason: string;
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  if (isLoading && seasons.length === 0) {
    return (
      <section
        className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="driver-cross-season-title"
      >
        <h2 id="driver-cross-season-title" className="font-['F1_Bold'] text-2xl">
          Cross-season comparison
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Loading season-over-season performance comparison…
        </p>
      </section>
    );
  }

  if (isError || seasons.length === 0) {
    return (
      <section
        className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="driver-cross-season-title"
      >
        <h2 id="driver-cross-season-title" className="font-['F1_Bold'] text-2xl">
          Cross-season comparison
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Cross-season comparison data is unavailable for this driver right now.
        </p>
      </section>
    );
  }

  const maxPoints = Math.max(
    1,
    ...seasons.map((season) => Math.max(season.points, 0))
  );
  const peakSeason = seasons.reduce((bestSeason, season) =>
    season.points > bestSeason.points ? season : bestSeason
  );
  const bestAverageFinishSeason = seasons.reduce<DriverCrossSeasonComparisonRow | null>(
    (bestSeason, season) => {
      if (season.averageFinish === null) {
        return bestSeason;
      }

      if (!bestSeason || bestSeason.averageFinish === null) {
        return season;
      }

      return season.averageFinish < bestSeason.averageFinish ? season : bestSeason;
    },
    null
  );
  const currentSeason =
    seasons.find((season) => season.season === selectedSeason) ?? seasons[0];
  const currentSeasonIndex = seasons.findIndex(
    (season) => season.season === currentSeason.season
  );
  const previousSeason =
    currentSeasonIndex >= 0 ? seasons[currentSeasonIndex + 1] : undefined;
  const pointsDelta = previousSeason
    ? currentSeason.points - previousSeason.points
    : null;
  const winsDelta = previousSeason ? currentSeason.wins - previousSeason.wins : null;
  const averageFinishDelta =
    previousSeason &&
    currentSeason.averageFinish !== null &&
    previousSeason.averageFinish !== null
      ? previousSeason.averageFinish - currentSeason.averageFinish
      : null;
  const bestAverageFinishSummary =
    bestAverageFinishSeason && bestAverageFinishSeason.averageFinish !== null
      ? `Avg P${bestAverageFinishSeason.averageFinish.toFixed(1)} with ${bestAverageFinishSeason.podiums} podiums.`
      : "Average finish data is unavailable in the current comparison window.";
  const labelClass =
    "font-['F1_Bold'] text-xs uppercase tracking-[0.16em] text-(--text-color3)";

  return (
    <section
      className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="driver-cross-season-title"
    >
      <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            Season-over-season analysis
          </p>
          <h2
            id="driver-cross-season-title"
            className="mt-2 font-['F1_Bold'] text-2xl"
          >
            Cross-season comparison
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          Compare how {driverName}&apos;s results stack up across the last {" "}
          {seasons.length} available seasons, balancing championship outcome,
          scoring power and average pace.
        </p>
      </div>

      <div className="mt-5 grid gap-4 min-[900px]:grid-cols-3">
        <article className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
          <p className={labelClass}>Peak season</p>
          <h3 className="mt-2 font-['F1_Bold'] text-2xl text-(--color3)">
            {peakSeason.season}
          </h3>
          <p className="mt-2 text-sm leading-6 text-(--text-color2)">
            {formatNumber(peakSeason.points, { maximumFractionDigits: 1 })} points,
            {" "}
            {formatNumber(peakSeason.wins)} wins and {" "}
            {peakSeason.championshipPosition !== null
              ? `P${peakSeason.championshipPosition}`
              : "no classified standing"}
            .
          </p>
        </article>

        <article className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
          <p className={labelClass}>Best race average</p>
          <h3 className="mt-2 font-['F1_Bold'] text-2xl text-(--color3)">
            {bestAverageFinishSeason?.season ?? "—"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-(--text-color2)">
            {bestAverageFinishSummary}
          </p>
        </article>

        <article className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
          <p className={labelClass}>
            {previousSeason
              ? `${currentSeason.season} vs ${previousSeason.season}`
              : "Selected season outlook"}
          </p>
          <h3 className="mt-2 font-['F1_Bold'] text-2xl text-(--color3)">
            {pointsDelta !== null
              ? `${formatSignedNumber(pointsDelta)} pts`
              : `${formatNumber(currentSeason.points, {
                  maximumFractionDigits: 1,
                })} pts`}
          </h3>
          <p className="mt-2 text-sm leading-6 text-(--text-color2)">
            {previousSeason
              ? `${winsDelta && winsDelta > 0 ? "+" : ""}${winsDelta ?? 0} wins${
                  averageFinishDelta !== null
                    ? ` · ${formatSignedNumber(averageFinishDelta)} avg-finish swing`
                    : " · average finish unavailable"
                }.`
              : `${currentSeason.raceStarts} starts, ${currentSeason.podiums} podiums and ${currentSeason.constructorName ?? "team data unavailable"}.`}
          </p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 min-[980px]:grid-cols-2">
        {seasons.map((season) => {
          const pointsWidth = `${Math.max((season.points / maxPoints) * 100, 8)}%`;
          const isSelected = season.season === selectedSeason;

          return (
            <article
              key={season.season}
              aria-label={`${season.season} season summary`}
              className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={labelClass}>{season.constructorName ?? "Team unavailable"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-['F1_Bold'] text-2xl text-(--text-color)">
                      {season.season}
                    </h3>
                    {isSelected && (
                      <span className="rounded-full bg-(--color3) px-3 py-1 text-[11px] font-['F1_Bold'] uppercase tracking-[0.12em] text-white">
                        Current view
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-['F1_Bold'] text-2xl text-(--color3)">
                    {season.championshipPosition !== null
                      ? `P${season.championshipPosition}`
                      : "—"}
                  </p>
                  <p className={labelClass}>Championship</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={labelClass}>Points</span>
                  <span className="font-['F1_Bold'] text-sm text-(--text-color2)">
                    {formatNumber(season.points, { maximumFractionDigits: 1 })} pts
                  </span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-(--background-buttons)">
                  <div
                    className="h-full rounded-full bg-(--color3)"
                    style={{ width: pointsWidth }}
                  />
                </div>
              </div>

              <dl className="mt-4 grid gap-3 min-[520px]:grid-cols-3">
                <div>
                  <dt className={labelClass}>Wins</dt>
                  <dd className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
                    {formatNumber(season.wins)}
                  </dd>
                </div>
                <div>
                  <dt className={labelClass}>Podiums</dt>
                  <dd className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
                    {formatNumber(season.podiums)}
                  </dd>
                </div>
                <div>
                  <dt className={labelClass}>Starts</dt>
                  <dd className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
                    {formatNumber(season.raceStarts)}
                  </dd>
                </div>
                <div>
                  <dt className={labelClass}>Avg finish</dt>
                  <dd className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
                    {season.averageFinish !== null
                      ? `P${season.averageFinish.toFixed(1)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className={labelClass}>Avg quali</dt>
                  <dd className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
                    {season.averageQualifying !== null
                      ? `P${season.averageQualifying.toFixed(1)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className={labelClass}>Best finish</dt>
                  <dd className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
                    {season.bestFinish !== null ? `P${season.bestFinish}` : "—"}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-sm leading-6 text-(--text-color3)">
                Best qualifying: {season.bestQualifying !== null ? `P${season.bestQualifying}` : "—"}.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DriverPortraitFallback(): JSX.Element {
  return (
    <svg
      className="h-auto w-full fill-current opacity-65"
      viewBox="0 0 240 320"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="120" cy="82" r="54" />
      <path d="M42 306c9-64 42-100 78-100s69 36 78 100H42z" />
      <path d="M82 171c16 14 30 20 38 20s22-6 38-20v38c0 23-17 42-38 42s-38-19-38-42v-38z" />
    </svg>
  );
}

function DriverHelmetFallback(): JSX.Element {
  return (
    <svg
      className="h-auto w-full fill-current opacity-70"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M101 61c0-25-18-43-41-43-25 0-44 20-44 45 0 17 10 29 23 36 5 3 8 7 11 12h22c3-5 8-9 13-12 10-5 16-13 16-24v-14z" />
      <path
        d="M65 54h34c3 0 5 2 5 5v8c0 3-2 5-5 5H66c-11 0-20 9-20 20v3h-9v-8c0-18 14-33 28-33z"
        className="fill-(--background-buttons) opacity-90"
      />
    </svg>
  );
}

function DriverProfileSkeletonBlock({
  className,
}: {
  className: string;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`${driverProfileSkeletonBlockClass} ${className}`}
    />
  );
}

function DriverProfileSkeleton(): JSX.Element {
  const iconCardBase = `${driverProfileCardBaseClass} flex items-center justify-center p-5`;
  const statCardClass = `${driverProfileCardBaseClass} flex flex-col items-center justify-center gap-3 p-5 text-center`;

  return (
    <div
      className="mx-auto mt-10 w-full max-w-6xl px-2.5 min-[1490px]:px-0"
      data-testid="driver-profile-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading driver profile</span>

      <div className="grid gap-5 min-[984px]:grid-cols-[minmax(0,1fr)_auto] min-[984px]:items-stretch">
        <div
          className={`${driverProfileCardBaseClass} relative overflow-hidden p-5 min-[1490px]:p-7.5`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <DriverProfileSkeletonBlock className="h-3.5 w-28 rounded-full min-[1490px]:w-36" />
              <DriverProfileSkeletonBlock className="h-8 w-44 min-[360px]:h-10 min-[360px]:w-60 min-[1490px]:h-13 min-[1490px]:w-80" />
              <DriverProfileSkeletonBlock className="mt-1 h-12 w-24 min-[1490px]:h-15 min-[1490px]:w-36" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              <DriverProfileSkeletonBlock className="h-10 w-30 rounded-full min-[720px]:w-36" />
              <DriverProfileSkeletonBlock className="h-44 w-44 rounded-4xl min-[360px]:h-52 min-[360px]:w-52 min-[984px]:h-72 min-[984px]:w-72 min-[1490px]:h-96 min-[1490px]:w-96" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 min-[984px]:grid-cols-1 min-[984px]:gap-4 min-[984px]:w-36 min-[1490px]:w-44">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={iconCardBase}>
              <DriverProfileSkeletonBlock className="h-16 w-16 rounded-2xl min-[1490px]:h-24 min-[1490px]:w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 min-[1024px]:grid-cols-7 min-[1490px]:gap-6">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className={statCardClass}>
            <DriverProfileSkeletonBlock className="h-3 w-18 rounded-full" />
            <DriverProfileSkeletonBlock className="h-8 w-16 rounded-2xl min-[1490px]:h-9 min-[1490px]:w-18" />
            {index === 6 && (
              <DriverProfileSkeletonBlock className="h-3 w-20 rounded-full" />
            )}
          </div>
        ))}
      </div>

      {Array.from({ length: 3 }, (_, index) => (
        <section
          key={index}
          className={`${driverTrendCardClass} mt-6 p-5 min-[900px]:p-6`}
          aria-hidden="true"
        >
          <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
            <div className="space-y-3">
              <DriverProfileSkeletonBlock className="h-3 w-28 rounded-full" />
              <DriverProfileSkeletonBlock className="h-8 w-44 rounded-2xl" />
            </div>
            <div className="w-full max-w-xl space-y-2">
              <DriverProfileSkeletonBlock className="h-3 w-full rounded-full" />
              <DriverProfileSkeletonBlock className="h-3 w-5/6 rounded-full" />
            </div>
          </div>
          <div className="mt-5 grid gap-4 min-[900px]:grid-cols-2">
            <DriverProfileSkeletonBlock className="h-56 w-full rounded-[1.75rem]" />
            <div className="grid gap-3">
              <DriverProfileSkeletonBlock className="h-20 w-full rounded-[1.75rem]" />
              <DriverProfileSkeletonBlock className="h-20 w-full rounded-[1.75rem]" />
            </div>
          </div>
        </section>
      ))}

      <div className="mx-auto mt-8 w-full max-w-4xl px-5 pb-10">
        <div className="space-y-3">
          <DriverProfileSkeletonBlock className="h-7 w-32 rounded-full" />
          <DriverProfileSkeletonBlock className="h-4 w-full rounded-full" />
          <DriverProfileSkeletonBlock className="h-4 w-11/12 rounded-full" />
          <DriverProfileSkeletonBlock className="h-4 w-4/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function DriverProfile(): JSX.Element {
  const { id } = useParams({ from: "/driver/$id" });
  const { selectedSeason } = useSelectedSeason();
  const [favoriteDriverIds, setFavoriteDriverIds] =
    useState<string[]>(readFavoriteDrivers);
  const {
    data: standings,
    isLoading,
    error,
  } = useDriverStandings(selectedSeason, { throwOnError: false });
  const {
    data: driverRaceResults,
    isLoading: isRaceResultsLoading,
    error: driverRaceResultsError,
  } = useDriverRaceResults(id, selectedSeason, { throwOnError: false });
  const { data: qualifyingResults, isLoading: isQualifyingResultsLoading } =
    useAllQualifyingResults(selectedSeason, { throwOnError: false });
  const {
    data: driverStandingsTimeline,
    isLoading: isDriverStandingsTimelineLoading,
    error: driverStandingsTimelineError,
  } = useDriverStandingsTimeline(selectedSeason, { throwOnError: false });
  const crossSeasonComparisonQuery = useDriverCrossSeasonComparison(
    id,
    selectedSeason
  );

  const driver = useMemo<DriverStanding | undefined>(
    () => (standings ?? []).find((s) => s.Driver.driverId === id),
    [standings, id]
  );

  const averageFinishPosition = useMemo<number | null>(() => {
    const finishPositions = (driverRaceResults ?? []).map((result) =>
      parsePosition(result.position)
    );

    if (finishPositions.length === 0) {
      return null;
    }

    return getAveragePosition(finishPositions);
  }, [driverRaceResults]);
  const averageQualifyingPosition = useMemo<number | null>(() => {
    if (!id) {
      return null;
    }

    const qualifyingPositions = (qualifyingResults ?? []).map((race) => {
      const qualifyingResult = race.results.find(
        (result) => result.Driver.driverId === id
      );

      return parsePosition(qualifyingResult?.position);
    });

    return getAveragePosition(qualifyingPositions);
  }, [id, qualifyingResults]);
  const bestFinish = useMemo<DriverBestFinish | null>(
    () => getDriverBestFinish(driverRaceResults ?? []),
    [driverRaceResults]
  );
  const seasonFormPoints = useMemo(
    () =>
      buildDriverSeasonForm(
        driverRaceResults ?? [],
        qualifyingResults ?? [],
        id
      ),
    [driverRaceResults, id, qualifyingResults]
  );
  const careerTimelineItems = useMemo(
    () =>
      buildDriverCareerTimeline({
        driver,
        raceResults: driverRaceResults ?? [],
        standingsTimeline: driverStandingsTimeline ?? [],
        selectedSeason,
      }),
    [driver, driverRaceResults, driverStandingsTimeline, selectedSeason]
  );
  const driverStrengthMetrics = useMemo(
    () =>
      buildDriverStrengthMetrics({
        driver,
        raceResults: driverRaceResults ?? [],
        seasonFormPoints,
        averageFinishPosition,
        averageQualifyingPosition,
      }),
    [
      averageFinishPosition,
      averageQualifyingPosition,
      driver,
      driverRaceResults,
      seasonFormPoints,
    ]
  );
  const crossSeasonComparison = useMemo(
    () =>
      buildDriverCrossSeasonComparison({
        seasons: crossSeasonComparisonQuery.data,
        driverId: id,
      }),
    [crossSeasonComparisonQuery.data, id]
  );

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    if (driver) {
      document.title = `${driver.Driver.givenName} ${driver.Driver.familyName}`;
    }
  }, [driver]);

  const driverConstructor = driver?.Constructors?.[0];
  useFavicon(
    driverConstructor ? getTeamLogo(driverConstructor.name) : undefined
  );

  if (isLoading) {
    return <DriverProfileSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load driver profile"
        message={error.message}
        icon="⚠️"
      />
    );
  }

  if (!driver) {
    return <div>No driver data available</div>;
  }

  const { Driver, Constructors } = driver;
  const age = Driver.dateOfBirth ? calculateAge(Driver.dateOfBirth) : null;
  const permanentNumberImg = getPermanentNumberImage(Driver.permanentNumber);
  const portrait = getDriverImage(Driver.driverId, "profile");
  const helmet = getDriverHelmet(Driver.driverId);
  const bio = driversBioMap[Driver.driverId];
  const primaryConstructor = Constructors[0];
  const driverFullName = `${Driver.givenName} ${Driver.familyName}`;
  const teamImg = primaryConstructor
    ? getTeamLogo(primaryConstructor.name)
    : undefined;
  const flagCode = Driver.nationality
    ? nationalityMap[Driver.nationality]
    : undefined;
  const isFavoriteDriver = favoriteDriverIds.includes(Driver.driverId);
  const favoriteButtonLabel = isFavoriteDriver
    ? `Remove ${driverFullName} from favorite drivers`
    : `Mark ${driverFullName} as favorite`;
  const handleFavoriteToggle = (): void => {
    setFavoriteDriverIds((currentFavoriteDriverIds) => {
      const nextFavoriteDriverIds = currentFavoriteDriverIds.includes(
        Driver.driverId
      )
        ? currentFavoriteDriverIds.filter(
            (favoriteDriverId) => favoriteDriverId !== Driver.driverId
          )
        : [...currentFavoriteDriverIds, Driver.driverId];

      return saveFavoriteDrivers(nextFavoriteDriverIds);
    });
  };
  const averageFinishDisplay = isRaceResultsLoading
    ? "…"
    : averageFinishPosition !== null
      ? averageFinishPosition.toFixed(1)
      : "—";
  const averageQualifyingDisplay = isQualifyingResultsLoading
    ? "…"
    : averageQualifyingPosition !== null
      ? averageQualifyingPosition.toFixed(1)
      : "—";
  const bestFinishDisplay = isRaceResultsLoading
    ? "…"
    : bestFinish
      ? `P${bestFinish.position}`
      : "—";
  const bestFinishDetail = isRaceResultsLoading
    ? "Loading race results"
    : (bestFinish?.raceName ?? "No classified finishes");

  const cardBase = driverProfileCardBaseClass;
  const iconCardBase = `${cardBase} flex items-center justify-center p-5`;
  const statCardClass = `${cardBase} flex flex-col items-center justify-center gap-2 p-5 text-center min-[1490px]:hover:-translate-y-[5px]`;
  const statLabelClass =
    "font-['F1_Regular'] text-xs uppercase tracking-[0.15em] text-(--text-color3) min-[1490px]:text-sm";
  const statValueClass =
    "font-['F1_Bold'] text-2xl text-(--color3) min-[1490px]:text-3xl";

  return (
    <>
      <div className="mx-auto mt-10 w-full max-w-6xl px-2.5 min-[1490px]:px-0">
        <div className="grid gap-5 min-[984px]:grid-cols-[minmax(0,1fr)_auto] min-[984px]:items-stretch">
          {/* Hero card: name, number and portrait */}
          <div
            className={`${cardBase} relative overflow-hidden p-5 min-[1490px]:p-7.5`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-3">
                <p className="font-['F1_Regular'] text-xs uppercase tracking-[0.2em] text-(--text-color3) min-[1490px]:text-sm">
                  Driver · {selectedSeason}
                </p>
                <h1 className="cursor-default font-['F1_Bold'] text-[27px] leading-tight min-[360px]:text-3xl min-[1490px]:text-5xl">
                  {Driver.givenName} {Driver.familyName}
                </h1>
                {permanentNumberImg ? (
                  <img
                    className="permanentNumberDriver mt-1 h-auto w-24 max-h-30 object-contain min-[1490px]:w-36 min-[1490px]:max-h-37.5"
                    src={permanentNumberImg}
                    alt={Driver.permanentNumber}
                  />
                ) : (
                  <span className="font-['F1_Bold'] text-4xl text-(--color3) min-[1490px]:text-5xl">
                    {Driver.permanentNumber}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3">
                <button
                  type="button"
                  aria-pressed={isFavoriteDriver}
                  aria-label={favoriteButtonLabel}
                  className={`rounded-full border px-3 py-2 font-['F1_Bold'] text-xs uppercase tracking-[0.12em] shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color3) min-[720px]:px-4 ${
                    isFavoriteDriver
                      ? "border-(--color3) bg-(--color3) text-white"
                      : "border-(--background-color2) bg-(--background-color) text-(--text-color2) hover:border-(--color3) hover:text-(--color3)"
                  }`}
                  onClick={handleFavoriteToggle}
                >
                  <span
                    aria-hidden="true"
                    className="mr-2 text-base leading-none"
                  >
                    {isFavoriteDriver ? "★" : "☆"}
                  </span>
                  {isFavoriteDriver ? "Favorited" : "Favorite"}
                </button>
                <ImageWithFallback
                  className="pointer-events-none -mr-4 -mb-5 h-auto w-44 self-end object-contain min-[360px]:w-52 min-[984px]:w-72 min-[1490px]:w-96"
                  src={portrait}
                  alt={`${driverFullName} portrait`}
                  fallbackClassName="min-h-0 min-w-0 border-0 bg-transparent p-0 text-(--text-color3)"
                  fallbackContent={<DriverPortraitFallback />}
                />
              </div>
            </div>
          </div>

          {/* Identity strip: flag, team, helmet */}
          <div className="grid grid-cols-3 gap-3 min-[984px]:grid-cols-1 min-[984px]:gap-4 min-[984px]:w-36 min-[1490px]:w-44">
            <div className={iconCardBase} aria-label="Nationality">
              <Flag
                className="h-16 w-16 object-contain min-[1490px]:h-24 min-[1490px]:w-24"
                code={flagCode}
              />
            </div>
            {primaryConstructor && (
              <Link
                to="/constructor/$id"
                params={{ id: primaryConstructor.constructorId }}
                search={seasonSearchParams(selectedSeason)}
                key={primaryConstructor.constructorId}
                className={`${iconCardBase} transition-opacity hover:opacity-70`}
                aria-label={`Constructor: ${primaryConstructor.name}`}
              >
                {teamImg && (
                  <img
                    className="h-16 w-full object-contain min-[1490px]:h-24"
                    src={teamImg}
                    alt={primaryConstructor.name}
                  />
                )}
              </Link>
            )}
            <div className={iconCardBase} aria-label="Helmet">
              <ImageWithFallback
                className="h-16 w-16 object-contain min-[1490px]:h-24 min-[1490px]:w-24"
                src={helmet}
                alt={`${driverFullName} helmet`}
                fallbackClassName="min-h-0 min-w-0 border-0 bg-transparent p-0 text-(--text-color3)"
                fallbackContent={<DriverHelmetFallback />}
              />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid cursor-default grid-cols-2 gap-4 min-[1024px]:grid-cols-7 min-[1490px]:gap-6">
          <div className={statCardClass}>
            <p className={statLabelClass}>Date of Birth</p>
            <p className={statValueClass}>
              {Driver.dateOfBirth}
              {age !== null ? ` (${age})` : ""}
            </p>
          </div>
          <div className={statCardClass}>
            <p className={statLabelClass}>Position</p>
            <p className={statValueClass}>{driver.position}</p>
          </div>
          <div className={statCardClass}>
            <p className={statLabelClass}>Wins</p>
            <p className={statValueClass}>{driver.wins}</p>
          </div>
          <div className={statCardClass}>
            <p className={statLabelClass}>Points</p>
            <p className={statValueClass}>{driver.points}</p>
          </div>
          <div className={statCardClass}>
            <p className={statLabelClass}>Avg Finish</p>
            <p className={statValueClass}>{averageFinishDisplay}</p>
          </div>
          <div className={statCardClass}>
            <p className={statLabelClass}>Avg Quali</p>
            <p className={statValueClass}>{averageQualifyingDisplay}</p>
          </div>
          <div className={statCardClass}>
            <p className={statLabelClass}>Best Finish</p>
            <p className={statValueClass}>{bestFinishDisplay}</p>
            <p
              className="max-w-full truncate text-xs text-(--text-color3)"
              title={bestFinishDetail}
            >
              {bestFinishDetail}
            </p>
          </div>
        </div>

        <DriverStrengthsRadarChart
          metrics={driverStrengthMetrics}
          driverName={driverFullName}
          selectedSeason={selectedSeason}
          isLoading={isRaceResultsLoading || isQualifyingResultsLoading}
          isError={Boolean(driverRaceResultsError)}
        />

        <DriverSeasonFormChart
          points={seasonFormPoints}
          driverName={driverFullName}
          isLoading={isRaceResultsLoading || isQualifyingResultsLoading}
          isError={Boolean(driverRaceResultsError)}
        />

        <DriverCareerTimeline
          items={careerTimelineItems}
          driverName={driverFullName}
          selectedSeason={selectedSeason}
          isLoading={isRaceResultsLoading || isDriverStandingsTimelineLoading}
          isError={Boolean(
            driverRaceResultsError || driverStandingsTimelineError
          )}
        />

        <DriverCrossSeasonComparison
          seasons={crossSeasonComparison}
          driverName={driverFullName}
          selectedSeason={selectedSeason}
          isLoading={crossSeasonComparisonQuery.isLoading}
          isError={crossSeasonComparisonQuery.isError}
        />
      </div>

      {/* Biography */}
      <div className="mx-auto mt-8 w-full max-w-4xl cursor-default px-5 pb-10 text-left text-base leading-relaxed min-[1490px]:text-justify">
        <h1 className="mb-3 font-['F1_Bold'] text-xl underline decoration-(--color3) underline-offset-4">
          Biography
        </h1>
        {bio && <p>{bio}</p>}
      </div>
    </>
  );
}

export default DriverProfile;
