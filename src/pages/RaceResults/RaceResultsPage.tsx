import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { TFunction } from "i18next";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import {
  useCurrentSeasonRaces,
  useRaceLapTimings,
  useRacePitStops,
  useRaceHighlights,
  useRaceResults,
  useStewardInvestigations,
  useSprintResults,
} from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import type {
  ErgastDriver,
  ErgastRace,
  RaceLap,
  PitStop,
  RaceResult,
  StewardInvestigation,
  SprintResult,
} from "../../services/api/racesApi";

// ---------------------------------------------------------------------------
// Domain types
//
// Shapes mirror the subset of the Ergast / Jolpica race-results payload
// consumed by this page. Optional fields reflect that the upstream API
// omits values for retirements (no `Time`), races without a recorded
// fastest lap, etc.
// ---------------------------------------------------------------------------

type RaceResultDriver = ErgastDriver;

type DriverPitStopMap = Map<string, PitStop>;
type DriverPitStopStrategyMap = Map<string, PitStop[]>;
type PositionChartPoint = { lap: number; position: number };
type PositionChartSeries = {
  color: string;
  constructorName: string;
  driverId: string;
  finalPosition: number;
  label: string;
  points: PositionChartPoint[];
};
type RaceTimelineEventType =
  | "start"
  | "lead-change"
  | "pit-stop"
  | "fastest-lap"
  | "charge"
  | "finish";
type RaceTimelineEvent = {
  constructorName?: string;
  context: string;
  driverId?: string;
  driverLabel?: string;
  headline: string;
  highlight: string;
  id: string;
  label: string;
  lap: number;
  summary: string;
  timeLabel: string;
  type: RaceTimelineEventType;
};
type TimePenaltyEntry = {
  affectedDriver: RaceResult | null;
  driverNumber: number | null;
  investigation: StewardInvestigation;
};
type RaceResultsSortMetric = "fastest-lap" | "fastest-pit-stop";
type RaceResultsSortOrder =
  | "classification"
  | "fastest-lap-asc"
  | "fastest-lap-desc"
  | "fastest-pit-stop-asc"
  | "fastest-pit-stop-desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POSITION_CHART_COLORS = [
  "#e10600",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
  "#7c3aed",
  "#0f766e",
] as const;
const TIME_PENALTY_MESSAGE_REGEX =
  /\btime penalty\b|\bpenalty served\b|\badded to (?:the )?elapsed time\b/i;

const buildRaceHighlightsFallbackUrl = (
  season: string,
  raceName: string
): string => {
  const url = new URL("https://www.youtube.com/@Formula1/search");
  url.searchParams.set("query", `Race Highlights ${season} ${raceName}`);
  return url.toString();
};

const parsePositiveInteger = (value?: string | number): number | null => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getColumnSortState = (
  sortOrder: RaceResultsSortOrder,
  metric: RaceResultsSortMetric
): "none" | "ascending" | "descending" => {
  if (sortOrder === `${metric}-asc`) return "ascending";
  if (sortOrder === `${metric}-desc`) return "descending";
  return "none";
};

const formatPositionLabel = (
  position: string | number,
  t: TFunction
): string => t("raceResults.positionLabel", { position });

const formatLapLabel = (lap: string | number, t: TFunction): string =>
  t("raceResults.lapLabel", { lap });

const formatStopLabel = (stop: string | number, t: TFunction): string =>
  t("raceResults.stopLabel", { stop });

const getSortButtonLabel = (
  sortOrder: RaceResultsSortOrder,
  metric: RaceResultsSortMetric,
  t: TFunction
): string => {
  const sortState = getColumnSortState(sortOrder, metric);

  if (metric === "fastest-lap") {
    if (sortState === "none") return t("raceResults.sort.fastestLapFastestFirst");
    if (sortState === "ascending") {
      return t("raceResults.sort.fastestLapSlowestFirst");
    }
    return t("raceResults.sort.reset");
  }

  if (sortState === "none") {
    return t("raceResults.sort.fastestPitStopQuickestFirst");
  }
  if (sortState === "ascending") {
    return t("raceResults.sort.fastestPitStopSlowestFirst");
  }

  return t("raceResults.sort.reset");
};

const parseLapTimeToMilliseconds = (lapTime?: string): number | null => {
  if (!lapTime) return null;

  const segments = lapTime
    .split(":")
    .map((segment) => Number.parseFloat(segment));
  if (segments.some((segment) => Number.isNaN(segment))) return null;

  return Math.round(
    segments.reduce((total, segment) => total * 60 + segment, 0) * 1000
  );
};

const getFastestLapTimeValue = (result: RaceResult): number | null =>
  parseLapTimeToMilliseconds(result.FastestLap?.Time?.time);

const compareOptionalMetricValues = (
  left: number | null,
  right: number | null,
  direction: 1 | -1
): number => {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  return direction * (left - right);
};

const getFastestPitStopTimeValue = (
  result: RaceResult,
  fastestPitStopsByDriver: ReadonlyMap<string, PitStop>
): number | null => {
  const fastestPitStop = fastestPitStopsByDriver.get(result.Driver.driverId);
  if (!fastestPitStop) return null;

  const duration = getPitStopDurationValue(fastestPitStop);
  return Number.isNaN(duration) ? null : duration;
};

const getFastestLapDriver = (
  results: readonly RaceResult[]
): RaceResult | null => {
  if (!Array.isArray(results) || results.length === 0) return null;

  return results.reduce<RaceResult | null>((fastest, current) => {
    const currentTime = getFastestLapTimeValue(current);
    if (currentTime === null) return fastest;
    if (!fastest) return current;

    const fastestTime = getFastestLapTimeValue(fastest);
    if (fastestTime === null) return current;

    return currentTime < fastestTime ? current : fastest;
  }, null);
};

const sortRaceResults = (
  results: readonly RaceResult[],
  sortOrder: RaceResultsSortOrder,
  fastestPitStopsByDriver: ReadonlyMap<string, PitStop>
): RaceResult[] => {
  if (sortOrder === "classification") return [...results];

  const direction: 1 | -1 = sortOrder.endsWith("-asc") ? 1 : -1;
  const metric: RaceResultsSortMetric = sortOrder.startsWith("fastest-pit-stop")
    ? "fastest-pit-stop"
    : "fastest-lap";

  return [...results].sort((left, right) => {
    const leftMetricValue =
      metric === "fastest-lap"
        ? getFastestLapTimeValue(left)
        : getFastestPitStopTimeValue(left, fastestPitStopsByDriver);
    const rightMetricValue =
      metric === "fastest-lap"
        ? getFastestLapTimeValue(right)
        : getFastestPitStopTimeValue(right, fastestPitStopsByDriver);

    const metricDifference = compareOptionalMetricValues(
      leftMetricValue,
      rightMetricValue,
      direction
    );
    if (metricDifference !== 0) return metricDifference;

    return Number(left.position) - Number(right.position);
  });
};

const getDriverLabel = (driver: RaceResultDriver): string => {
  if (driver.code) return driver.code;

  const fullName = [driver.givenName, driver.familyName]
    .filter(Boolean)
    .join(" ");
  return fullName || driver.driverId;
};

const formatRaceDate = (
  date: string | undefined,
  time: string | undefined,
  language: string,
  t: TFunction
): string => {
  if (!date) return t("raceResults.dateTbc");

  const dateText = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));

  if (!time) return dateText;

  const normalizedTime = time.endsWith("Z") ? time : `${time}Z`;
  const timeText = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(`${date}T${normalizedTime}`));

  return `${dateText} · ${timeText}`;
};

const formatRaceControlTime = (
  date: string,
  language: string
): string | null => {
  const parsedDate = Date.parse(date);
  if (Number.isNaN(parsedDate)) return null;

  const timeText = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(parsedDate));

  return `${timeText} UTC`;
};

const getRaceLocation = (raceInfo?: ErgastRace): string => {
  const location = raceInfo?.Circuit.Location;
  return [location?.locality, location?.country].filter(Boolean).join(", ");
};

const getStewardInvestigationStatusLabel = (
  status: StewardInvestigation["status"],
  t: TFunction
): string => {
  switch (status) {
    case "under-investigation":
      return t("raceResults.investigations.status.underInvestigation");
    case "no-further-action":
      return t("raceResults.investigations.status.noFurtherAction");
    case "penalty":
      return t("raceResults.investigations.status.penalty");
    case "warning":
      return t("raceResults.investigations.status.warning");
    default:
      return t("raceResults.investigations.status.stewardsNote");
  }
};

const getStewardInvestigationStatusClass = (
  status: StewardInvestigation["status"]
): string => {
  switch (status) {
    case "under-investigation":
      return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";
    case "no-further-action":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
    case "penalty":
      return "bg-[#e10600]/10 text-[#e10600] ring-1 ring-[#e10600]/20";
    case "warning":
      return "bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/20";
    default:
      return "bg-(--background-buttons) text-(--text-color) ring-1 ring-(--button-background)";
  }
};

const extractCarNumberFromMessage = (message: string): number | null => {
  const match = message.match(/\bcar\s+(\d+)\b/i);
  return match ? parsePositiveInteger(match[1]) : null;
};

const getRaceResultsByDriverNumber = (
  results: readonly RaceResult[]
): ReadonlyMap<number, RaceResult> => {
  const resultsByDriverNumber = new Map<number, RaceResult>();

  results.forEach((result) => {
    const driverNumber = parsePositiveInteger(result.Driver.permanentNumber);
    if (driverNumber === null) return;

    resultsByDriverNumber.set(driverNumber, result);
  });

  return resultsByDriverNumber;
};

const buildTimePenaltyEntries = (
  investigations: readonly StewardInvestigation[],
  results: readonly RaceResult[]
): TimePenaltyEntry[] => {
  const resultsByDriverNumber = getRaceResultsByDriverNumber(results);

  return investigations
    .filter((investigation) => TIME_PENALTY_MESSAGE_REGEX.test(investigation.message))
    .map((investigation) => {
      const driverNumber =
        investigation.driverNumber ?? extractCarNumberFromMessage(investigation.message);

      return {
        affectedDriver:
          driverNumber === null ? null : (resultsByDriverNumber.get(driverNumber) ?? null),
        driverNumber,
        investigation,
      };
    });
};

const getTimePenaltyValueLabel = (
  message: string,
  t: TFunction
): string | null => {
  const match = message.match(/(\d+)\s*second time penalty/i);
  if (!match) return null;

  return t("raceResults.timePenalties.penaltyValue", {
    seconds: Number.parseInt(match[1], 10),
  });
};

const getTimePenaltyOutcomeLabel = (message: string, t: TFunction): string => {
  if (/penalty served/i.test(message)) {
    return t("raceResults.timePenalties.outcomes.served");
  }

  if (/added to (?:the )?elapsed time|post-race/i.test(message)) {
    return t("raceResults.timePenalties.outcomes.applied");
  }

  return t("raceResults.timePenalties.outcomes.issued");
};

const getPodium = (results: readonly RaceResult[], t: TFunction): string => {
  const podium = results
    .filter((result) => ["1", "2", "3"].includes(result.position))
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((result) => getDriverLabel(result.Driver));

  return podium.length > 0 ? podium.join(" / ") : t("raceResults.pending");
};

const getDriverFullName = (driver: RaceResultDriver): string =>
  [driver.givenName, driver.familyName].filter(Boolean).join(" ");

const getPitStopDurationValue = (pitStop: PitStop): number =>
  Number.parseFloat(pitStop.duration ?? "");

const getFastestPitStopsByDriver = (
  pitStops: readonly PitStop[]
): DriverPitStopMap => {
  const fastestByDriver: DriverPitStopMap = new Map();

  pitStops.forEach((pitStop) => {
    const duration = getPitStopDurationValue(pitStop);
    if (!pitStop.driverId || Number.isNaN(duration)) return;

    const currentFastest = fastestByDriver.get(pitStop.driverId);
    if (!currentFastest) {
      fastestByDriver.set(pitStop.driverId, pitStop);
      return;
    }

    if (duration < getPitStopDurationValue(currentFastest)) {
      fastestByDriver.set(pitStop.driverId, pitStop);
    }
  });

  return fastestByDriver;
};

const sortPitStopsByStrategyOrder = (pitStops: readonly PitStop[]): PitStop[] =>
  [...pitStops].sort((a, b) => {
    const stopDifference = Number(a.stop ?? 0) - Number(b.stop ?? 0);
    if (stopDifference !== 0) return stopDifference;

    return Number(a.lap ?? 0) - Number(b.lap ?? 0);
  });

const getPitStopStrategiesByDriver = (
  pitStops: readonly PitStop[]
): DriverPitStopStrategyMap => {
  const strategiesByDriver: DriverPitStopStrategyMap = new Map();

  pitStops.forEach((pitStop) => {
    if (!pitStop.driverId) return;

    const driverPitStops = strategiesByDriver.get(pitStop.driverId) ?? [];
    driverPitStops.push(pitStop);
    strategiesByDriver.set(
      pitStop.driverId,
      sortPitStopsByStrategyOrder(driverPitStops)
    );
  });

  return strategiesByDriver;
};

const getTireStrategyStopLabel = (
  pitStops: readonly PitStop[],
  t: TFunction
): string => t("raceResults.tireStrategy.stops", { count: pitStops.length });

const getTireStrategyLapSummary = (
  pitStops: readonly PitStop[],
  t: TFunction
): string => {
  const stopLaps = pitStops
    .map((pitStop) => pitStop.lap)
    .filter((lap): lap is string => Boolean(lap));

  return stopLaps.length > 0
    ? t("raceResults.tireStrategy.laps", { laps: stopLaps.join(" / ") })
    : t("raceResults.tireStrategy.lapDataTbc");
};

const getPitStopMeta = (pitStop: PitStop | undefined, t: TFunction): string | null => {
  if (!pitStop) return null;

  const parts = [
    pitStop.lap ? formatLapLabel(pitStop.lap, t) : null,
    pitStop.stop ? formatStopLabel(pitStop.stop, t) : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
};

const getFastestLapMeta = (
  fastestLap: RaceResult["FastestLap"] | undefined,
  t: TFunction
): string | null => {
  if (!fastestLap) return null;

  const parts = [
    fastestLap.rank ? t("raceResults.rankLabel", { rank: fastestLap.rank }) : null,
    fastestLap.lap ? formatLapLabel(fastestLap.lap, t) : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
};

const formatExportValueWithMeta = (
  value: string | undefined,
  meta: string | null,
  emptyValueLabel: string
): string => {
  if (!value) return emptyValueLabel;
  return meta ? `${value} (${meta})` : value;
};

const escapeCsvValue = (value: string): string => {
  const normalizedValue = value.replace(/\r?\n/g, " ");
  if (!/[",\r\n]/.test(normalizedValue)) return normalizedValue;

  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const getExportDriverLabel = (driver: RaceResultDriver): string => {
  const label = getDriverLabel(driver);
  const fullName = getDriverFullName(driver);
  if (!fullName || fullName === label) return label;

  return `${label} - ${fullName}`;
};

const getExportTireStrategy = (
  pitStops: readonly PitStop[] | undefined,
  t: TFunction
): string => {
  if (!pitStops || pitStops.length === 0) {
    return t("raceResults.export.noStopsStrategyUnavailable");
  }

  return `${getTireStrategyStopLabel(pitStops, t)} (${getTireStrategyLapSummary(
    pitStops,
    t
  )})`;
};

const buildRaceResultsCsv = (
  results: readonly RaceResult[],
  fastestPitStopsByDriver: ReadonlyMap<string, PitStop>,
  pitStopStrategiesByDriver: ReadonlyMap<string, readonly PitStop[]>,
  t: TFunction
): string => {
  const headers = [
    t("raceResults.classification.columns.position"),
    t("raceResults.classification.columns.driver"),
    t("raceResults.classification.columns.constructor"),
    t("raceResults.classification.columns.timeStatus"),
    t("raceResults.classification.columns.fastestLap"),
    t("raceResults.classification.columns.tireStrategy"),
    t("raceResults.classification.columns.fastestPitStop"),
    t("raceResults.classification.columns.points"),
  ];
  const emptyValueLabel = t("raceResults.notAvailable");

  const rows = results.map((result) => {
    const fastestPitStop = fastestPitStopsByDriver.get(result.Driver.driverId);
    const tireStrategy = pitStopStrategiesByDriver.get(result.Driver.driverId);
    const fastestLapMeta = getFastestLapMeta(result.FastestLap, t);
    const pitStopMeta = getPitStopMeta(fastestPitStop, t);

    return [
      result.position,
      getExportDriverLabel(result.Driver),
      result.Constructor?.name ?? t("raceResults.constructorTbc"),
      result.Time?.time ?? result.status ?? emptyValueLabel,
      formatExportValueWithMeta(
        result.FastestLap?.Time?.time,
        fastestLapMeta,
        emptyValueLabel
      ),
      getExportTireStrategy(tireStrategy, t),
      formatExportValueWithMeta(
        fastestPitStop?.duration ? `${fastestPitStop.duration}s` : undefined,
        pitStopMeta,
        emptyValueLabel
      ),
      result.points,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

const getRaceResultsExportFilename = (
  season: string,
  round: string,
  raceTitle: string,
  fallbackSlug: string
): string => {
  const raceSlug = raceTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${season}-round-${round}-${raceSlug || fallbackSlug}-results.csv`;
};

const getPositionAccentClass = (position: string): string => {
  if (position === "1")
    return "border-yellow-400/70 bg-yellow-400/15 text-yellow-700";
  if (position === "2")
    return "border-slate-300/80 bg-slate-300/20 text-slate-600";
  if (position === "3")
    return "border-amber-600/60 bg-amber-600/15 text-amber-700";
  return "border-(--background-buttons-hover) bg-(--background-buttons) text-(--text-color)";
};

const getPositionMedal = (position: string): string | null => {
  if (position === "1") return "🥇";
  if (position === "2") return "🥈";
  if (position === "3") return "🥉";
  return null;
};

const getGridVersusFinishLabel = (result: RaceResult, t: TFunction): string => {
  const gridPosition = parsePositiveInteger(result.grid);
  const finishPosition = parsePositiveInteger(result.position);

  if (gridPosition === null && finishPosition === null) {
    return t("raceResults.gridFinish.unavailable");
  }

  if (gridPosition === null) {
    return finishPosition === null
      ? t("raceResults.gridFinish.gridUnavailable")
      : t("raceResults.gridFinish.finishOnly", { position: finishPosition });
  }

  if (finishPosition === null) {
    return t("raceResults.gridFinish.gridOnly", { position: gridPosition });
  }

  return t("raceResults.gridFinish.gridToFinish", {
    finishPosition,
    gridPosition,
  });
};

const getRaceResultsByDriverId = (
  results: readonly RaceResult[]
): ReadonlyMap<string, RaceResult> =>
  new Map(results.map((result) => [result.Driver.driverId, result]));

const getDriverLabelById = (
  driverId: string,
  resultsByDriver: ReadonlyMap<string, RaceResult>
): string => {
  const result = resultsByDriver.get(driverId);
  return result ? getDriverLabel(result.Driver) : driverId;
};

const getLeaderDriverId = (lap: RaceLap): string | null =>
  lap.Timings?.find((timing) => timing.position === "1")?.driverId ?? null;

const getOverallFastestPitStop = (
  pitStops: readonly PitStop[]
): PitStop | null => {
  let fastestPitStop: PitStop | null = null;

  pitStops.forEach((pitStop) => {
    const duration = getPitStopDurationValue(pitStop);
    if (!pitStop.driverId || Number.isNaN(duration)) return;
    if (!fastestPitStop || duration < getPitStopDurationValue(fastestPitStop)) {
      fastestPitStop = pitStop;
    }
  });

  return fastestPitStop;
};

const getRaceTimelineTypeLabel = (
  type: RaceTimelineEventType,
  t: TFunction
): string => {
  switch (type) {
    case "start":
      return t("raceResults.timeline.types.start");
    case "lead-change":
      return t("raceResults.timeline.types.leadChange");
    case "pit-stop":
      return t("raceResults.timeline.types.pitStop");
    case "fastest-lap":
      return t("raceResults.timeline.types.fastestLap");
    case "charge":
      return t("raceResults.timeline.types.charge");
    case "finish":
      return t("raceResults.timeline.types.finish");
    default:
      return t("raceResults.timeline.types.default");
  }
};

const buildRaceTimelineEvents = ({
  fastestLapDriver,
  pitStops,
  podiumLabel,
  raceTitle,
  laps,
  results,
  t,
  winner,
  winningTimeLabel,
}: {
  fastestLapDriver: RaceResult | null;
  pitStops: readonly PitStop[];
  podiumLabel: string;
  raceTitle: string;
  laps: readonly RaceLap[];
  results: readonly RaceResult[];
  t: TFunction;
  winner?: RaceResult;
  winningTimeLabel: string;
}): RaceTimelineEvent[] => {
  if (results.length === 0) return [];

  const resultsByDriver = getRaceResultsByDriverId(results);
  const orderedLaps = [...laps]
    .map((lap) => ({
      lap,
      lapNumber: parsePositiveInteger(lap.number),
    }))
    .filter(
      (entry): entry is { lap: RaceLap; lapNumber: number } =>
        entry.lapNumber !== null
    )
    .sort((left, right) => left.lapNumber - right.lapNumber);
  const finalLap =
    parsePositiveInteger(winner?.laps) ??
    orderedLaps[orderedLaps.length - 1]?.lapNumber ??
    1;
  const events: RaceTimelineEvent[] = [];

  const poleSitter = results.find(
    (result) => parsePositiveInteger(result.grid) === 1
  );
  const openingLapNumber = orderedLaps[0]?.lapNumber ?? 1;
  const openingLeaderId =
    (orderedLaps[0] ? getLeaderDriverId(orderedLaps[0].lap) : null) ??
    winner?.Driver.driverId ??
    results[0]?.Driver.driverId;

  if (openingLeaderId) {
    const openingLeader = resultsByDriver.get(openingLeaderId);
    const openingGrid = parsePositiveInteger(openingLeader?.grid);
    const openingLeaderLabel = getDriverLabelById(openingLeaderId, resultsByDriver);
    const poleSitterLabel = poleSitter ? getDriverLabel(poleSitter.Driver) : null;
    const stoleLead =
      poleSitter && poleSitter.Driver.driverId !== openingLeaderId && openingGrid !== 1;

    events.push({
      constructorName:
        openingLeader?.Constructor?.name ?? t("raceResults.constructorTbc"),
      context: stoleLead
        ? t("raceResults.timeline.events.start.stoleLeadContext", {
            lap: openingLapNumber,
            poleSitter: poleSitterLabel,
          })
        : openingGrid
          ? t("raceResults.timeline.events.start.gridContext", {
              position: openingGrid,
            })
          : t("raceResults.timeline.events.start.defaultContext"),
      driverId: openingLeaderId,
      driverLabel: openingLeaderLabel,
      headline: stoleLead
        ? t("raceResults.timeline.events.start.stoleLeadHeadline", {
            driver: openingLeaderLabel,
          })
        : t("raceResults.timeline.events.start.controlsOpeningPhaseHeadline", {
            driver: openingLeaderLabel,
          }),
      highlight: openingGrid
        ? t("raceResults.timeline.events.start.startedPosition", {
            position: openingGrid,
          })
        : t("raceResults.timeline.events.start.raceLaunch"),
      id: `timeline-start-${openingLeaderId}-${openingLapNumber}`,
      label: t("raceResults.timeline.labels.start"),
      lap: openingLapNumber,
      summary: stoleLead
        ? t("raceResults.timeline.events.start.stoleLeadSummary", {
            driver: openingLeaderLabel,
            lap: openingLapNumber,
          })
        : t("raceResults.timeline.events.start.controlsOpeningPhaseSummary", {
            driver: openingLeaderLabel,
            raceTitle,
          }),
      timeLabel: formatLapLabel(openingLapNumber, t),
      type: "start",
    });

    let previousLeaderId = openingLeaderId;
    orderedLaps.slice(1).forEach(({ lap, lapNumber }) => {
      const leaderId = getLeaderDriverId(lap);
      if (!leaderId || leaderId === previousLeaderId) return;

      const leaderResult = resultsByDriver.get(leaderId);
      const leaderLabel = getDriverLabelById(leaderId, resultsByDriver);
      const previousLeaderLabel = getDriverLabelById(
        previousLeaderId,
        resultsByDriver
      );

      events.push({
        constructorName:
          leaderResult?.Constructor?.name ?? t("raceResults.constructorTbc"),
        context: `${t("raceResults.timeline.labels.leadChange")}: ${previousLeaderLabel} → ${leaderLabel}`,
        driverId: leaderId,
        driverLabel: leaderLabel,
        headline: t("raceResults.timeline.events.leadChange.headline", {
          driver: leaderLabel,
        }),
        highlight: t("raceResults.timeline.events.leadChange.highlight", {
          from: previousLeaderLabel,
          to: leaderLabel,
        }),
        id: `timeline-lead-change-${lapNumber}-${leaderId}`,
        label: t("raceResults.timeline.labels.leadChange"),
        lap: lapNumber,
        summary: t("raceResults.timeline.events.leadChange.summary", {
          driver: leaderLabel,
          lap: lapNumber,
          previousDriver: previousLeaderLabel,
        }),
        timeLabel: formatLapLabel(lapNumber, t),
        type: "lead-change",
      });

      previousLeaderId = leaderId;
    });
  }

  const fastestPitStop = getOverallFastestPitStop(pitStops);
  if (fastestPitStop?.driverId && fastestPitStop.duration) {
    const fastestPitStopDriver = resultsByDriver.get(fastestPitStop.driverId);
    const fastestPitStopLap = parsePositiveInteger(fastestPitStop.lap) ?? finalLap;
    const fastestPitStopDriverLabel = getDriverLabelById(
      fastestPitStop.driverId,
      resultsByDriver
    );
    const stopLabel = fastestPitStop.stop
      ? formatStopLabel(fastestPitStop.stop, t)
      : t("raceResults.timeline.events.fastestPitStop.pitWindow");

    events.push({
      constructorName:
        fastestPitStopDriver?.Constructor?.name ?? t("raceResults.constructorTbc"),
      context: t("raceResults.timeline.events.fastestPitStop.context", {
        lap: fastestPitStopLap,
        stopLabel,
      }),
      driverId: fastestPitStop.driverId,
      driverLabel: fastestPitStopDriverLabel,
      headline: t("raceResults.timeline.events.fastestPitStop.headline", {
        driver: fastestPitStopDriverLabel,
      }),
      highlight: `${fastestPitStop.duration}s`,
      id: `timeline-pit-stop-${fastestPitStop.driverId}-${fastestPitStopLap}`,
      label: t("raceResults.timeline.labels.fastestStop"),
      lap: fastestPitStopLap,
      summary: t("raceResults.timeline.events.fastestPitStop.summary", {
        driver: fastestPitStopDriverLabel,
        duration: fastestPitStop.duration,
        lap: fastestPitStopLap,
      }),
      timeLabel: formatLapLabel(fastestPitStopLap, t),
      type: "pit-stop",
    });
  }

  const fastestLapTime = fastestLapDriver?.FastestLap?.Time?.time;
  const fastestLapNumber = parsePositiveInteger(fastestLapDriver?.FastestLap?.lap);
  if (fastestLapDriver && fastestLapTime && fastestLapNumber !== null) {
    const fastestLapDriverLabel = getDriverLabel(fastestLapDriver.Driver);

    events.push({
      constructorName:
        fastestLapDriver.Constructor?.name ?? t("raceResults.constructorTbc"),
      context: t("raceResults.timeline.events.fastestLap.context", {
        lap: fastestLapNumber,
      }),
      driverId: fastestLapDriver.Driver.driverId,
      driverLabel: fastestLapDriverLabel,
      headline: t("raceResults.timeline.events.fastestLap.headline", {
        driver: fastestLapDriverLabel,
      }),
      highlight: fastestLapTime,
      id: `timeline-fastest-lap-${fastestLapDriver.Driver.driverId}-${fastestLapNumber}`,
      label: t("raceResults.timeline.labels.fastestLap"),
      lap: fastestLapNumber,
      summary: t("raceResults.timeline.events.fastestLap.summary", {
        driver: fastestLapDriverLabel,
        lap: fastestLapNumber,
        time: fastestLapTime,
      }),
      timeLabel: formatLapLabel(fastestLapNumber, t),
      type: "fastest-lap",
    });
  }

  const biggestMover = results.reduce<
    { gain: number; result: RaceResult } | null
  >((best, result) => {
    const gridPosition = parsePositiveInteger(result.grid);
    const finishPosition = parsePositiveInteger(result.position);
    if (gridPosition === null || finishPosition === null) return best;

    const gain = gridPosition - finishPosition;
    if (gain <= 0) return best;
    if (!best || gain > best.gain) return { gain, result };

    return best;
  }, null);

  if (biggestMover) {
    const finishPosition = parsePositiveInteger(biggestMover.result.position);
    const gridPosition = parsePositiveInteger(biggestMover.result.grid);
    const biggestMoverLabel = getDriverLabel(biggestMover.result.Driver);

    if (finishPosition !== null && gridPosition !== null) {
      events.push({
        constructorName:
          biggestMover.result.Constructor?.name ?? t("raceResults.constructorTbc"),
        context: t("raceResults.timeline.events.biggestCharge.context", {
          finish: finishPosition,
          grid: gridPosition,
        }),
        driverId: biggestMover.result.Driver.driverId,
        driverLabel: biggestMoverLabel,
        headline: t("raceResults.timeline.events.biggestCharge.headline", {
          driver: biggestMoverLabel,
        }),
        highlight: t("raceResults.timeline.events.biggestCharge.highlight", {
          count: biggestMover.gain,
        }),
        id: `timeline-charge-${biggestMover.result.Driver.driverId}-${finalLap}`,
        label: t("raceResults.timeline.labels.biggestCharge"),
        lap: finalLap,
        summary: t("raceResults.timeline.events.biggestCharge.summary", {
          count: biggestMover.gain,
          driver: biggestMoverLabel,
        }),
        timeLabel: t("raceResults.timeline.finishMoment"),
        type: "charge",
      });
    }
  }

  if (winner) {
    const winnerLabel = getDriverLabel(winner.Driver);

    events.push({
      constructorName: winner.Constructor?.name ?? t("raceResults.constructorTbc"),
      context: t("raceResults.timeline.events.finish.context", {
        podium: podiumLabel,
      }),
      driverId: winner.Driver.driverId,
      driverLabel: winnerLabel,
      headline: t("raceResults.timeline.events.finish.headline", {
        driver: winnerLabel,
        raceTitle,
      }),
      highlight: winningTimeLabel,
      id: `timeline-finish-${winner.Driver.driverId}-${finalLap}`,
      label: t("raceResults.timeline.labels.chequeredFlag"),
      lap: finalLap,
      summary: t("raceResults.timeline.events.finish.summary", {
        podium: podiumLabel,
        winningTime: winningTimeLabel,
      }),
      timeLabel: formatLapLabel(finalLap, t),
      type: "finish",
    });
  }

  const eventPriority: Record<RaceTimelineEventType, number> = {
    start: 0,
    "lead-change": 1,
    "pit-stop": 2,
    "fastest-lap": 3,
    charge: 4,
    finish: 5,
  };

  return events.sort(
    (left, right) =>
      left.lap - right.lap || eventPriority[left.type] - eventPriority[right.type]
  );
};

const buildPositionChartSeries = (
  laps: readonly RaceLap[],
  results: readonly RaceResult[],
  t: TFunction
): PositionChartSeries[] => {
  const pointsByDriver = new Map<string, PositionChartPoint[]>();

  laps.forEach((lap) => {
    const lapNumber = parsePositiveInteger(lap.number);
    if (lapNumber === null) return;

    (lap.Timings ?? []).forEach((timing) => {
      const position = parsePositiveInteger(timing.position);
      if (!timing.driverId || position === null) return;

      const driverPoints = pointsByDriver.get(timing.driverId) ?? [];
      driverPoints.push({ lap: lapNumber, position });
      pointsByDriver.set(timing.driverId, driverPoints);
    });
  });

  return [...results]
    .sort((left, right) => Number(left.position) - Number(right.position))
    .flatMap((result, index) => {
      const points = pointsByDriver.get(result.Driver.driverId);
      if (!points || points.length === 0) return [];

      return [
        {
          color: POSITION_CHART_COLORS[index % POSITION_CHART_COLORS.length],
          constructorName: result.Constructor?.name ?? t("raceResults.constructorTbc"),
          driverId: result.Driver.driverId,
          finalPosition:
            parsePositiveInteger(result.position) ?? points[points.length - 1].position,
          label: getDriverLabel(result.Driver),
          points: [...points].sort((left, right) => left.lap - right.lap),
        },
      ];
    });
};

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-3xl border border-dashed border-[#e10600]/40 bg-[#e10600]/5 p-6 text-sm font-bold text-(--text-color2) sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[#dc3545]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex w-fit cursor-pointer rounded-full bg-(--button-background) px-5 py-2 text-sm font-black text-(--button-text) transition-colors hover:bg-(--color2) focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e10600]/60"
      >
        {t("raceResults.retry")}
      </button>
    </div>
  );
}

function PositionChangesChart({
  error,
  highlightedDriverId,
  isLoading,
  laps,
  onRetry,
  raceTitle,
  results,
}: {
  error?: Error | null;
  highlightedDriverId?: string;
  isLoading: boolean;
  laps: readonly RaceLap[];
  onRetry: () => void;
  raceTitle: string;
  results: readonly RaceResult[];
}): JSX.Element {
  const { t } = useTranslation();
  const series = useMemo(
    () => buildPositionChartSeries(laps, results, t),
    [laps, results, t]
  );
  const allPoints = series.flatMap((driverSeries) => driverSeries.points);
  const width = 920;
  const height = 430;
  const margin = { top: 32, right: 32, bottom: 54, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const minLap = Math.min(...allPoints.map((point) => point.lap));
  const maxLap = Math.max(...allPoints.map((point) => point.lap));
  const maxPosition = Math.max(
    results.length,
    ...allPoints.map((point) => point.position),
    1
  );
  const xTicks = [
    minLap,
    Math.round((minLap + maxLap) / 2),
    maxLap,
  ].filter((tick, index, ticks) => ticks.indexOf(tick) === index);
  const yTicks = [1, Math.ceil(maxPosition / 2), maxPosition].filter(
    (tick, index, ticks) => ticks.indexOf(tick) === index
  );
  const activeSeries = highlightedDriverId
    ? series.find((driverSeries) => driverSeries.driverId === highlightedDriverId)
    : undefined;
  const scaleX = (lap: number): number => {
    if (maxLap === minLap) return margin.left + plotWidth / 2;
    return margin.left + ((lap - minLap) / (maxLap - minLap)) * plotWidth;
  };
  const scaleY = (position: number): number => {
    if (maxPosition === 1) return margin.top + plotHeight / 2;
    return margin.top + ((position - 1) / (maxPosition - 1)) * plotHeight;
  };
  const toPath = (points: readonly PositionChartPoint[]): string =>
    points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"}${scaleX(point.lap).toFixed(1)},${scaleY(
          point.position
        ).toFixed(1)}`
      )
      .join(" ");

  return (
    <section
      aria-label={t("raceResults.chart.ariaLabel")}
      className="rounded-[1.75rem] border border-(--button-background) bg-(--background-color) p-4 shadow-xl shadow-black/5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-(--button-background) pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">
            {t("raceResults.chart.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {t("raceResults.chart.heading")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-(--text-color2)">
            {t("raceResults.chart.description")}
          </p>
        </div>
        {series.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <p className="inline-flex w-fit rounded-full bg-(--background-buttons) px-4 py-2 text-sm font-black shadow-sm">
              {t("raceResults.chart.summary", {
                count: series.length,
                maxLap,
                minLap,
              })}
            </p>
            {activeSeries && (
              <p className="inline-flex w-fit rounded-full bg-[#e10600]/10 px-4 py-2 text-sm font-black text-[#e10600] shadow-sm">
                {t("raceResults.chart.focus", { driver: activeSeries.label })}
              </p>
            )}
          </div>
        )}
      </div>

      {error ? (
        <SectionError
          message={t("raceResults.chart.error")}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <div className="rounded-3xl border border-dashed border-(--button-background) bg-(--background-buttons) p-6 text-sm font-bold text-(--text-color2)">
          {t("raceResults.chart.loading")}
        </div>
      ) : series.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-(--button-background) bg-(--background-buttons) p-6 text-sm font-bold text-(--text-color2)">
          {t("raceResults.chart.unavailable")}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <div className="overflow-x-auto rounded-3xl bg-linear-to-br from-(--background-buttons) to-(--background-color) p-3 ring-1 ring-(--button-background)">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={t("raceResults.chart.svgAriaLabel", { raceTitle })}
              className="min-w-[760px]"
            >
              <desc>
                {t("raceResults.chart.svgDescription", {
                  maxLap,
                  minLap,
                })}
              </desc>
              <rect width={width} height={height} rx="28" fill="transparent" />
              {yTicks.map((tick) => {
                const y = scaleY(tick);
                return (
                  <g key={`position-${tick}`}>
                    <line
                      x1={margin.left}
                      x2={width - margin.right}
                      y1={y}
                      y2={y}
                      stroke="var(--background-color2)"
                      strokeDasharray="4 8"
                    />
                    <text
                      x={margin.left - 14}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-(--text-color2) text-[12px] font-bold"
                    >
                      {formatPositionLabel(tick, t)}
                    </text>
                  </g>
                );
              })}
              {xTicks.map((tick) => {
                const x = scaleX(tick);
                return (
                  <g key={`lap-${tick}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={margin.top}
                      y2={height - margin.bottom}
                      stroke="var(--background-color2)"
                      strokeDasharray="4 8"
                    />
                    <text
                      x={x}
                      y={height - 18}
                      textAnchor="middle"
                      className="fill-(--text-color2) text-[12px] font-bold"
                    >
                      {formatLapLabel(tick, t)}
                    </text>
                  </g>
                );
              })}
              <line
                x1={margin.left}
                x2={margin.left}
                y1={margin.top}
                y2={height - margin.bottom}
                stroke="var(--text-color)"
                strokeOpacity="0.35"
              />
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={height - margin.bottom}
                y2={height - margin.bottom}
                stroke="var(--text-color)"
                strokeOpacity="0.35"
              />
              {series.map((driverSeries) => {
                const isHighlighted =
                  !highlightedDriverId || driverSeries.driverId === highlightedDriverId;

                return (
                  <g key={driverSeries.driverId}>
                    <path
                      d={toPath(driverSeries.points)}
                      fill="none"
                      opacity={isHighlighted ? 1 : 0.18}
                      stroke={driverSeries.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={isHighlighted ? "4.5" : "2.5"}
                    />
                    <circle
                      cx={scaleX(driverSeries.points[0].lap)}
                      cy={scaleY(driverSeries.points[0].position)}
                      fill={driverSeries.color}
                      opacity={isHighlighted ? 1 : 0.25}
                      r={isHighlighted ? "5" : "4"}
                    />
                    <circle
                      cx={scaleX(driverSeries.points[driverSeries.points.length - 1].lap)}
                      cy={scaleY(
                        driverSeries.points[driverSeries.points.length - 1].position
                      )}
                      fill={driverSeries.color}
                      opacity={isHighlighted ? 1 : 0.25}
                      r={isHighlighted ? "6" : "5"}
                      stroke="var(--background-color)"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="rounded-3xl border border-(--button-background) bg-(--background-buttons) p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-(--text-color2)">
              {t("raceResults.chart.driverKey")}
            </h3>
            <ul className="mt-4 grid max-h-96 gap-2 overflow-y-auto pr-1 text-sm">
              {series.map((driverSeries) => (
                <li
                  key={driverSeries.driverId}
                  className={`flex items-center justify-between gap-3 rounded-2xl bg-(--background-color) px-3 py-2 ring-1 ring-(--button-background) transition-all ${
                    highlightedDriverId === driverSeries.driverId
                      ? "ring-[#e10600] shadow-lg shadow-[#e10600]/10"
                      : ""
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: driverSeries.color }}
                    />
                    <span className="min-w-0">
                      <span className="block font-black">{driverSeries.label}</span>
                      <span className="block truncate text-xs text-(--text-color2)">
                        {driverSeries.constructorName}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#e10600]/10 px-2.5 py-1 text-xs font-black text-[#e10600]">
                    {formatPositionLabel(driverSeries.finalPosition, t)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function StewardInvestigationsPanel({
  error,
  investigations,
  isLoading,
  language,
  onRetry,
  raceTitle,
}: {
  error?: Error | null;
  investigations: readonly StewardInvestigation[];
  isLoading: boolean;
  language: string;
  onRetry: () => void;
  raceTitle: string;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("raceResults.investigations.ariaLabel")}
      className="rounded-[1.75rem] border border-(--button-background) bg-(--background-color) p-4 shadow-xl shadow-black/5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-(--button-background) pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">
            {t("raceResults.investigations.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {t("raceResults.investigations.title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-(--text-color2)">
            {t("raceResults.investigations.description", { raceTitle })}
          </p>
        </div>
        {!error && !isLoading && investigations.length > 0 && (
          <p className="inline-flex w-fit rounded-full bg-(--background-buttons) px-4 py-2 text-sm font-black shadow-sm">
            {t("raceResults.investigations.records", {
              count: investigations.length,
            })}
          </p>
        )}
      </div>

      {error ? (
        <SectionError
          message={t("raceResults.investigations.error")}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <div className="rounded-3xl border border-dashed border-(--button-background) bg-(--background-buttons) p-6 text-sm font-bold text-(--text-color2)">
          {t("raceResults.investigations.loading")}
        </div>
      ) : investigations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-(--button-background) bg-(--background-buttons) p-6 text-sm font-bold text-(--text-color2)">
          {t("raceResults.investigations.empty")}
        </div>
      ) : (
        <ol className="grid gap-4">
          {investigations.map((investigation) => {
            const timeLabel = formatRaceControlTime(investigation.date, language);

            return (
              <li
                key={investigation.id}
                className="rounded-3xl border border-(--button-background) bg-linear-to-br from-(--background-buttons) to-(--background-color) p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-(--text-color2)">
                    <span className="rounded-full bg-(--background-color) px-3 py-1 ring-1 ring-(--button-background)">
                      {investigation.lapNumber
                        ? formatLapLabel(investigation.lapNumber, t)
                        : t("raceResults.investigations.lapFallback")}
                    </span>
                    {timeLabel && (
                      <span className="rounded-full bg-(--background-color) px-3 py-1 ring-1 ring-(--button-background)">
                        {timeLabel}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] ${getStewardInvestigationStatusClass(
                      investigation.status
                    )}`}
                  >
                    {getStewardInvestigationStatusLabel(investigation.status, t)}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold leading-7 text-(--text-color) sm:text-base">
                  {investigation.message}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function TimePenaltiesPanel({
  error,
  isLoading,
  language,
  onRetry,
  penalties,
  raceTitle,
}: {
  error?: Error | null;
  isLoading: boolean;
  language: string;
  onRetry: () => void;
  penalties: readonly TimePenaltyEntry[];
  raceTitle: string;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("raceResults.timePenalties.ariaLabel")}
      className="rounded-[1.75rem] border border-(--button-background) bg-(--background-color) p-4 shadow-xl shadow-black/5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-(--button-background) pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">
            {t("raceResults.timePenalties.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {t("raceResults.timePenalties.title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-(--text-color2)">
            {t("raceResults.timePenalties.description", { raceTitle })}
          </p>
        </div>
        {!error && !isLoading && penalties.length > 0 && (
          <p className="inline-flex w-fit rounded-full bg-(--background-buttons) px-4 py-2 text-sm font-black shadow-sm">
            {t("raceResults.timePenalties.adjustments", {
              count: penalties.length,
            })}
          </p>
        )}
      </div>

      {error ? (
        <SectionError
          message={t("raceResults.timePenalties.error")}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <div className="rounded-3xl border border-dashed border-(--button-background) bg-(--background-buttons) p-6 text-sm font-bold text-(--text-color2)">
          {t("raceResults.timePenalties.loading")}
        </div>
      ) : penalties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-(--button-background) bg-(--background-buttons) p-6 text-sm font-bold text-(--text-color2)">
          {t("raceResults.timePenalties.empty")}
        </div>
      ) : (
        <ol className="grid gap-4">
          {penalties.map((entry) => {
            const { affectedDriver, driverNumber, investigation } = entry;
            const timeLabel = formatRaceControlTime(investigation.date, language);
            const penaltyLabel = getTimePenaltyValueLabel(investigation.message, t);
            const outcomeLabel = getTimePenaltyOutcomeLabel(investigation.message, t);
            const driverLabel = affectedDriver
              ? getDriverLabel(affectedDriver.Driver)
              : driverNumber !== null
                ? t("raceResults.timePenalties.driverNumberFallback", {
                    driverNumber,
                  })
                : t("raceResults.timePenalties.raceControlFallback");
            const driverFullName = affectedDriver
              ? getDriverFullName(affectedDriver.Driver)
              : "";
            const constructorName = affectedDriver?.Constructor?.name;
            const gridVersusFinishLabel = affectedDriver
              ? getGridVersusFinishLabel(affectedDriver, t)
              : null;

            return (
              <li
                key={investigation.id}
                className="rounded-3xl border border-(--button-background) bg-linear-to-br from-[#e10600]/8 via-(--background-buttons) to-(--background-color) p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-(--text-color2)">
                      {constructorName ?? t("raceResults.timePenalties.raceControlFallback")}
                    </p>
                    <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                      {driverLabel}
                    </h3>
                    {driverFullName && driverFullName !== driverLabel && (
                      <p className="mt-1 text-sm text-(--text-color2)">{driverFullName}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {penaltyLabel && (
                      <span className="inline-flex rounded-full bg-[#e10600] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                        {penaltyLabel}
                      </span>
                    )}
                    <span className="inline-flex rounded-full bg-[#e10600]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#e10600] ring-1 ring-[#e10600]/20">
                      {outcomeLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-(--text-color2)">
                  <span className="rounded-full bg-(--background-color) px-3 py-1 ring-1 ring-(--button-background)">
                    {investigation.lapNumber
                      ? formatLapLabel(investigation.lapNumber, t)
                      : t("raceResults.investigations.lapFallback")}
                  </span>
                  {timeLabel && (
                    <span className="rounded-full bg-(--background-color) px-3 py-1 ring-1 ring-(--button-background)">
                      {timeLabel}
                    </span>
                  )}
                  {affectedDriver && (
                    <span className="rounded-full bg-(--background-color) px-3 py-1 ring-1 ring-(--button-background)">
                      {t("raceResults.timePenalties.finalPosition", {
                        position: affectedDriver.position,
                      })}
                    </span>
                  )}
                  {gridVersusFinishLabel && (
                    <span className="rounded-full bg-(--background-color) px-3 py-1 ring-1 ring-(--button-background)">
                      {gridVersusFinishLabel}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm font-bold leading-7 text-(--text-color) sm:text-base">
                  {investigation.message}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function RaceTimeline({
  activeEventId,
  events,
  hasLapData,
  onSelectEvent,
  raceTitle,
}: {
  activeEventId: string;
  events: readonly RaceTimelineEvent[];
  hasLapData: boolean;
  onSelectEvent: (eventId: string) => void;
  raceTitle: string;
}): JSX.Element {
  const { t } = useTranslation();
  const activeEvent =
    events.find((event) => event.id === activeEventId) ?? events[0];

  return (
    <section
      aria-label={t("raceResults.timeline.ariaLabel")}
      className="rounded-[1.75rem] border border-(--button-background) bg-(--background-color) p-4 shadow-xl shadow-black/5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-(--button-background) pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">
            {t("raceResults.timeline.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {t("raceResults.timeline.heading")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-(--text-color2)">
            {t("raceResults.timeline.description", { raceTitle })}
          </p>
        </div>
        <p className="inline-flex w-fit rounded-full bg-(--background-buttons) px-4 py-2 text-sm font-black shadow-sm">
          {t("raceResults.timeline.momentsCaptured", { count: events.length })}
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          aria-label={t("raceResults.timeline.tablistAriaLabel", { raceTitle })}
          className="flex min-w-max gap-3"
          role="tablist"
        >
          {events.map((event) => {
            const isActive = event.id === activeEvent.id;

            return (
              <button
                key={event.id}
                aria-controls={`race-timeline-panel-${event.id}`}
                aria-selected={isActive}
                className={`min-w-56 rounded-3xl border px-4 py-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e10600] focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color) ${
                  isActive
                    ? "border-[#e10600]/40 bg-[#e10600]/10 shadow-lg shadow-[#e10600]/10"
                    : "border-(--button-background) bg-(--background-buttons) hover:-translate-y-0.5 hover:bg-(--background-color2)"
                }`}
                id={`race-timeline-tab-${event.id}`}
                onClick={() => onSelectEvent(event.id)}
                role="tab"
                type="button"
              >
                <span className="block text-[0.68rem] font-black uppercase tracking-[0.2em] text-(--text-color2)">
                  {event.timeLabel}
                </span>
                <span className="mt-2 block text-base font-black text-(--text-color)">
                  {event.label}
                </span>
                <span className="mt-2 block text-sm text-(--text-color2)">
                  {event.driverLabel ?? event.highlight}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-labelledby={`race-timeline-tab-${activeEvent.id}`}
        className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_20rem]"
        id={`race-timeline-panel-${activeEvent.id}`}
        role="tabpanel"
      >
        <div className="rounded-3xl border border-[#e10600]/20 bg-linear-to-br from-[#e10600]/12 via-(--background-color) to-(--background-buttons) p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e10600]">
            {activeEvent.timeLabel} · {getRaceTimelineTypeLabel(activeEvent.type, t)}
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-[2rem]">
            {activeEvent.headline}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-(--text-color2)">
            {activeEvent.summary}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-(--button-background) bg-(--background-buttons) p-4 shadow-sm">
            <dt className="text-xs font-black uppercase tracking-[0.18em] text-(--text-color2)">
              {t("raceResults.timeline.focusLabel")}
            </dt>
            <dd className="mt-2 text-lg font-black text-(--text-color)">
              {activeEvent.driverLabel ?? t("raceResults.timeline.raceWideSnapshot")}
            </dd>
          </div>
          <div className="rounded-2xl border border-(--button-background) bg-(--background-buttons) p-4 shadow-sm">
            <dt className="text-xs font-black uppercase tracking-[0.18em] text-(--text-color2)">
              {t("raceResults.timeline.highlightLabel")}
            </dt>
            <dd className="mt-2 text-lg font-black text-(--text-color)">
              {activeEvent.highlight}
            </dd>
          </div>
          <div className="rounded-2xl border border-(--button-background) bg-(--background-buttons) p-4 shadow-sm">
            <dt className="text-xs font-black uppercase tracking-[0.18em] text-(--text-color2)">
              {t("raceResults.timeline.teamLabel")}
            </dt>
            <dd className="mt-2 text-lg font-black text-(--text-color)">
              {activeEvent.constructorName ?? t("raceResults.timeline.raceContextFallback")}
            </dd>
          </div>
          <div className="rounded-2xl border border-(--button-background) bg-(--background-buttons) p-4 shadow-sm">
            <dt className="text-xs font-black uppercase tracking-[0.18em] text-(--text-color2)">
              {t("raceResults.timeline.contextLabel")}
            </dt>
            <dd className="mt-2 text-sm font-bold leading-6 text-(--text-color)">
              {activeEvent.context}
            </dd>
          </div>
        </dl>
      </div>

      {hasLapData && (
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-(--text-color2)">
          {t("raceResults.timeline.selectionHint")}
        </p>
      )}
    </section>
  );
}

function RaceResultsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { race } = useParams({ from: "/race/$race" });
  const navigate = useNavigate();
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const [resultsSortOrder, setResultsSortOrder] =
    useState<RaceResultsSortOrder>("classification");
  const [activeTimelineEventId, setActiveTimelineEventId] = useState<string>("");
  const { data: seasonRacesData } = useCurrentSeasonRaces(selectedSeason, {
    throwOnError: false,
  }) as {
    data: ErgastRace[] | undefined;
  };
  const {
    data: raceResultsData,
    isLoading,
    error,
    refetch: refetchRaceResults,
  } = useRaceResults(race, selectedSeason, { throwOnError: false }) as {
    data: RaceResult[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  const { data: racePitStopsData } = useRacePitStops(race, selectedSeason, {
    throwOnError: false,
  }) as {
    data: PitStop[] | undefined;
  };
  const {
    data: raceLapTimingsData,
    isLoading: isLapTimingsLoading,
    error: lapTimingsError,
    refetch: refetchLapTimings,
  } = useRaceLapTimings(race, selectedSeason, { throwOnError: false }) as {
    data: RaceLap[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  const { data: sprintResultsData } = useSprintResults(race, selectedSeason, {
    throwOnError: false,
  }) as {
    data: SprintResult[] | null | undefined;
  };
  const raceInfo = useMemo(
    () => seasonRacesData?.find((raceInfo) => raceInfo.round === race),
    [race, seasonRacesData]
  );
  const { data: raceHighlightsUrl } = useRaceHighlights(
    raceInfo?.raceName,
    selectedSeason,
    { throwOnError: false }
  ) as {
    data: string | undefined;
  };
  const {
    data: stewardInvestigationsData,
    isLoading: isStewardInvestigationsLoading,
    error: stewardInvestigationsError,
    refetch: refetchStewardInvestigations,
  } = useStewardInvestigations(raceInfo, selectedSeason, {
    throwOnError: false,
  }) as {
    data: StewardInvestigation[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };

  const results = useMemo<RaceResult[]>(
    () => raceResultsData ?? [],
    [raceResultsData]
  );
  const stewardInvestigations = useMemo<StewardInvestigation[]>(
    () => stewardInvestigationsData ?? [],
    [stewardInvestigationsData]
  );
  const timePenaltyEntries = useMemo<TimePenaltyEntry[]>(
    () => buildTimePenaltyEntries(stewardInvestigations, results),
    [results, stewardInvestigations]
  );
  const sprintAvailable = Array.isArray(sprintResultsData)
    ? sprintResultsData.length > 0
    : false;
  const fastestLapDriver = useMemo(
    () => getFastestLapDriver(results),
    [results]
  );
  const fastestPitStopsByDriver = useMemo(
    () => getFastestPitStopsByDriver(racePitStopsData ?? []),
    [racePitStopsData]
  );
  const pitStopStrategiesByDriver = useMemo(
    () => getPitStopStrategiesByDriver(racePitStopsData ?? []),
    [racePitStopsData]
  );
  const sortedResults = useMemo<RaceResult[]>(
    () => sortRaceResults(results, resultsSortOrder, fastestPitStopsByDriver),
    [fastestPitStopsByDriver, results, resultsSortOrder]
  );
  const winner = useMemo(
    () => results.find((result) => result.position === "1") ?? results[0],
    [results]
  );

  const raceTitle =
    raceInfo?.raceName ??
    t("raceResults.roundNameFallback", {
      round: race,
      season: selectedSeason,
    });
  const highlightsFallbackUrl = raceInfo?.raceName
    ? buildRaceHighlightsFallbackUrl(selectedSeason, raceInfo.raceName)
    : null;
  const highlightsHref = raceHighlightsUrl ?? highlightsFallbackUrl;
  const raceLocation = getRaceLocation(raceInfo);
  const classifiedCount = results.filter(
    (result) => result.Time || result.status === "Finished"
  ).length;
  const fastestLapTime = fastestLapDriver?.FastestLap?.Time?.time;
  const raceRoundLabel = t("raceResults.roundLabel", {
    round: race,
    season: selectedSeason,
  });
  const raceDateLabel = formatRaceDate(
    raceInfo?.date,
    raceInfo?.time,
    currentLanguage,
    t
  );
  const circuitName = raceInfo?.Circuit.circuitName ?? t("raceResults.circuitTbc");
  const distanceLabel = winner?.laps
    ? t("raceResults.distanceLabel", {
        count: Number(winner.laps),
        laps: winner.laps,
      })
    : t("raceResults.distanceTbc");
  const classificationSummary =
    results.length > 0
      ? t("raceResults.classifiedSummary", {
          count: classifiedCount,
          total: results.length,
        })
      : t("raceResults.classificationPending");
  const winnerLabel = winner
    ? `${getDriverLabel(winner.Driver)} · ${winner.Constructor?.name ?? t("raceResults.constructorTbc")}`
    : t("raceResults.pending");
  const winningTimeLabel = winner?.Time?.time
    ? t("raceResults.winningTime", { time: winner.Time.time })
    : (winner?.status ?? t("raceResults.awaitingChequeredFlag"));
  const fastestLapLabel =
    fastestLapDriver && fastestLapTime
      ? `${getDriverLabel(fastestLapDriver.Driver)} · ${fastestLapTime}`
      : t("raceResults.fastestLapNotRecorded");
  const podiumLabel = getPodium(results, t);
  const raceTimelineEvents = useMemo(
    () =>
      buildRaceTimelineEvents({
        fastestLapDriver,
        pitStops: racePitStopsData ?? [],
        podiumLabel,
        raceTitle,
        laps: raceLapTimingsData ?? [],
        results,
        t,
        winner,
        winningTimeLabel,
      }),
    [
      fastestLapDriver,
      podiumLabel,
      raceLapTimingsData,
      racePitStopsData,
      raceTitle,
      results,
      t,
      winner,
      winningTimeLabel,
    ]
  );
  const activeTimelineEvent = useMemo(
    () =>
      raceTimelineEvents.find((event) => event.id === activeTimelineEventId) ??
      raceTimelineEvents[0] ??
      null,
    [activeTimelineEventId, raceTimelineEvents]
  );
  const navigationLinkClass =
    "inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

  useEffect(() => {
    document.title = t("raceResults.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching race results:", error);
    }
  }, [error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResultsSortOrder("classification");
  }, [race, selectedSeason]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTimelineEventId("");
  }, [race, selectedSeason]);

  useEffect(() => {
    if (raceTimelineEvents.length === 0) {
      if (activeTimelineEventId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTimelineEventId("");
      }
      return;
    }

    if (raceTimelineEvents.some((event) => event.id === activeTimelineEventId)) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTimelineEventId(raceTimelineEvents[0].id);
  }, [activeTimelineEventId, raceTimelineEvents]);

  if (isLoading) {
    return (
      <div>
        <Loader label={t("raceResults.loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-[min(100%-2rem,80rem)] mt-5">
        <SectionError
          message={t("raceResults.error")}
          onRetry={() => void refetchRaceResults()}
        />
      </div>
    );
  }

  const headerClass =
    "px-4 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-white/75 first:rounded-tl-2xl last:rounded-tr-2xl";
  const numericHeaderClass = `${headerClass} text-center`;
  const cellClass = "px-4 py-4 align-middle";
  const numericCellClass = `${cellClass} text-center tabular-nums`;

  const navigateToDriverRaceDetails = (driverId: string): void => {
    void navigate({
      to: "/race/$race/driver/$driver",
      params: { race, driver: driverId },
      search: seasonSearchParams(selectedSeason),
    });
  };

  const handleRowClick =
    (driverId: string) => (event: MouseEvent<HTMLTableRowElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("a, button")) return;

      navigateToDriverRaceDetails(driverId);
    };

  const handleRowKeyDown =
    (driverId: string) => (event: KeyboardEvent<HTMLTableRowElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("a, button")) return;
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      navigateToDriverRaceDetails(driverId);
    };

  const toggleResultsSort = (metric: RaceResultsSortMetric): void => {
    setResultsSortOrder((current) => {
      const ascendingOrder = `${metric}-asc` as RaceResultsSortOrder;
      const descendingOrder = `${metric}-desc` as RaceResultsSortOrder;

      if (current !== ascendingOrder && current !== descendingOrder) {
        return ascendingOrder;
      }
      if (current === ascendingOrder) return descendingOrder;
      return "classification";
    });
  };

  const handleExportResults = (): void => {
    const csv = buildRaceResultsCsv(
      sortedResults,
      fastestPitStopsByDriver,
      pitStopStrategiesByDriver,
      t
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getRaceResultsExportFilename(
      selectedSeason,
      race,
      raceTitle,
      t("raceResults.export.filenameFallbackSlug")
    );
    link.click();
    URL.revokeObjectURL(url);
  };

  const fastestLapSortState = getColumnSortState(
    resultsSortOrder,
    "fastest-lap"
  );
  const fastestPitStopSortState = getColumnSortState(
    resultsSortOrder,
    "fastest-pit-stop"
  );

  const renderDriverName = (
    driver: RaceResultDriver,
    isFastestLap: boolean
  ): JSX.Element => {
    const driverLabel = getDriverLabel(driver);
    const fullName = getDriverFullName(driver);
    const className = isFastestLap
      ? "driver-name fastest-lap inline-flex min-w-0 flex-col gap-1 rounded-2xl border border-purple-400/40 bg-purple-500/10 px-3 py-2 font-black text-purple-700 shadow-sm transition-colors group-hover:bg-purple-500/15"
      : "driver-name inline-flex min-w-0 flex-col gap-1 rounded-2xl border border-transparent px-3 py-2 font-bold text-(--text-color) transition-colors group-hover:border-(--button-background) group-hover:bg-(--background-buttons)";
    return (
      <Link
        to="/driver/$id"
        params={{ id: driver.driverId }}
        search={seasonSearchParams(selectedSeason)}
        className={className}
      >
        <span className="text-base leading-none">{driverLabel}</span>
        {fullName && fullName !== driverLabel && (
          <span className="truncate text-xs font-normal opacity-70">
            {fullName}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="relative mx-auto w-[min(100%-2rem,80rem)] overflow-hidden rounded-4xl border border-(--button-background) bg-(--background-color) p-3 text-(--text-color) shadow-2xl shadow-black/5 sm:p-5 lg:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#e10600]/8 via-transparent to-[#15151e]/8"
      />
      <div className="relative space-y-6">
        <section className="overflow-hidden rounded-[1.75rem] bg-linear-to-br from-[#15151e] via-[#202033] to-[#e10600] text-white shadow-2xl shadow-black/20">
          <div className="relative px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/12 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-[#e10600]/35 blur-3xl"
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-white/75 backdrop-blur">
                  {t("raceResults.eyebrow")}
                </p>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  {t("raceResults.heading", { round: race, season: selectedSeason })}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                  {t("raceResults.description", { raceTitle })}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {highlightsHref && (
                  <a
                    href={highlightsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={navigationLinkClass}
                  >
                    <span aria-hidden="true">▶</span>
                    <span>{t("raceResults.watchHighlights")}</span>
                  </a>
                )}
                <Link
                  className={navigationLinkClass}
                  to="/qualifying/$round"
                  params={{ round: race }}
                  search={seasonSearchParams(selectedSeason)}
                >
                  <span aria-hidden="true">⏱</span>
                  <span>{t("raceResults.viewQualy")}</span>
                </Link>
                {sprintAvailable && (
                  <Link
                    to="/sprint/$round"
                    params={{ round: race }}
                    search={seasonSearchParams(selectedSeason)}
                    className={navigationLinkClass}
                  >
                    <span aria-hidden="true">⚡</span>
                    <span>{t("raceResults.viewSprintResults")}</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {t("raceResults.summary.event")}
                </p>
                <p className="mt-2 text-lg font-black">{raceTitle}</p>
                <p className="text-sm text-white/70">{raceRoundLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {t("raceResults.summary.classified")}
                </p>
                <p className="mt-2 text-lg font-black">
                  {classificationSummary}
                </p>
                <p className="text-sm text-white/70">{distanceLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  {t("raceResults.summary.fastestLap")}
                </p>
                <p className="mt-2 text-lg font-black">{fastestLapLabel}</p>
                <p className="text-sm text-white/70">
                  {t("raceResults.summary.highlightedBelow")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label={t("raceResults.overviewAriaLabel")}
          className="rounded-[1.75rem] border border-(--button-background) bg-(--background-color) p-4 shadow-xl shadow-black/5 sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-3 border-b border-(--button-background) pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#e10600]">
                {t("raceResults.overviewAriaLabel")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                {raceTitle}
              </h2>
            </div>
            <p className="inline-flex w-fit rounded-full bg-(--background-buttons) px-4 py-2 text-sm font-black shadow-sm">
              {raceRoundLabel}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-[#e10600]/20 bg-linear-to-br from-[#e10600]/12 via-(--background-color) to-(--background-buttons) p-5 shadow-lg shadow-black/5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e10600]">
                {t("raceResults.summary.winner")}
              </p>
              <p className="mt-3 text-2xl font-black sm:text-3xl">
                {winnerLabel}
              </p>
              <p className="mt-2 text-sm text-(--text-color2)">
                {winningTimeLabel}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-(--background-color)/70 p-4 ring-1 ring-(--button-background)">
                  <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                    {t("raceResults.summary.podium")}
                  </p>
                  <p className="mt-2 font-black">{podiumLabel}</p>
                </div>
                <div className="rounded-2xl bg-(--background-color)/70 p-4 ring-1 ring-(--button-background)">
                  <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                    {t("raceResults.summary.weekend")}
                  </p>
                  <p className="mt-2 font-black">
                    {sprintAvailable
                      ? t("raceResults.summary.sprintWeekend")
                      : t("raceResults.summary.grandPrixWeekend")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-(--button-background) bg-(--background-buttons) p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                  {t("raceResults.summary.circuit")}
                </p>
                <p className="mt-3 text-lg font-black">
                  {raceInfo?.Circuit.circuitId ? (
                    <Link
                      to="/circuit/$id"
                      params={{ id: raceInfo.Circuit.circuitId }}
                      search={seasonSearchParams(selectedSeason)}
                      className="text-(--text-color) underline decoration-[#e10600] decoration-2 underline-offset-4 transition-colors hover:text-[#e10600]"
                    >
                      {circuitName}
                    </Link>
                  ) : (
                    circuitName
                  )}
                </p>
                {raceLocation && (
                  <p className="mt-1 text-sm text-(--text-color2)">
                    {raceLocation}
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-(--button-background) bg-(--background-buttons) p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                  {t("raceResults.summary.scheduleDistance")}
                </p>
                <p className="mt-3 text-lg font-black">{raceDateLabel}</p>
                <p className="mt-1 text-sm text-(--text-color2)">
                  {distanceLabel} · {classificationSummary}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-(--button-background) p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                {t("raceResults.summary.fastestLap")}
              </p>
              <p className="mt-3 text-lg font-black">{fastestLapLabel}</p>
              <p className="mt-1 text-sm text-(--text-color2)">
                {t("raceResults.summary.highlightedInResultsTable")}
              </p>
            </div>
            <div className="rounded-3xl border border-(--button-background) p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                {t("raceResults.summary.raceStatus")}
              </p>
              <p className="mt-3 text-lg font-black">{classificationSummary}</p>
              <p className="mt-1 text-sm text-(--text-color2)">
                {t("raceResults.summary.officialClassificationSnapshot")}
              </p>
            </div>
            <div className="rounded-3xl border border-(--button-background) p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                {t("raceResults.summary.strategyData")}
              </p>
              <p className="mt-3 text-lg font-black">
                {t("raceResults.summary.strategyStops", {
                  count: racePitStopsData?.length ?? 0,
                })}
              </p>
              <p className="mt-1 text-sm text-(--text-color2)">
                {t("raceResults.summary.fastestStopSortableBelow")}
              </p>
            </div>
          </div>
        </section>
        {results.length > 0 && (
          <TimePenaltiesPanel
            error={stewardInvestigationsError}
            isLoading={isStewardInvestigationsLoading}
            language={currentLanguage}
            onRetry={() => void refetchStewardInvestigations()}
            penalties={timePenaltyEntries}
            raceTitle={raceTitle}
          />
        )}
        {results.length > 0 && (
          <StewardInvestigationsPanel
            error={stewardInvestigationsError}
            investigations={stewardInvestigations}
            isLoading={isStewardInvestigationsLoading}
            language={currentLanguage}
            onRetry={() => void refetchStewardInvestigations()}
            raceTitle={raceTitle}
          />
        )}
        {results.length > 0 && activeTimelineEvent && (
          <RaceTimeline
            activeEventId={activeTimelineEvent.id}
            events={raceTimelineEvents}
            hasLapData={(raceLapTimingsData ?? []).length > 0}
            onSelectEvent={setActiveTimelineEventId}
            raceTitle={raceTitle}
          />
        )}
        {results.length > 0 && (
          <PositionChangesChart
            error={lapTimingsError}
            highlightedDriverId={activeTimelineEvent?.driverId}
            isLoading={isLapTimingsLoading}
            laps={raceLapTimingsData ?? []}
            onRetry={() => void refetchLapTimings()}
            raceTitle={raceTitle}
            results={results}
          />
        )}
        {results.length === 0 ? (
          <EmptyState
            title={t("raceResults.empty.title")}
            message={t("raceResults.empty.message", {
              round: race,
              season: selectedSeason,
            })}
          />
        ) : (
          <section
            aria-label={t("raceResults.classification.ariaLabel")}
            className="overflow-hidden rounded-[1.75rem] border border-(--button-background) bg-(--background-color) shadow-2xl shadow-black/10"
          >
            <div className="flex flex-col gap-4 bg-linear-to-r from-[#15151e] via-[#1f1f2b] to-[#e10600] px-5 py-5 text-white md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/65">
                  {t("raceResults.classification.eyebrow")}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  {t("raceResults.classification.heading")}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-bold">
                <p className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                  {t("raceResults.classification.entriesListed", {
                    count: results.length,
                  })}
                </p>
                <p className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                  {t("raceResults.classification.clickRowHint")}
                </p>
                <button
                  type="button"
                  onClick={handleExportResults}
                  className="rounded-full border border-white/40 bg-white px-4 py-2 font-black text-[#15151e] shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15151e]"
                  aria-label={t("raceResults.classification.exportAriaLabel", {
                    raceTitle,
                  })}
                >
                  {t("raceResults.classification.exportCsv")}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-280 border-separate border-spacing-0 text-sm text-(--text-color) transition-all duration-300 ease-in-out md:text-base">
                <caption className="sr-only">
                  {t("raceResults.classification.caption", {
                    round: race,
                    season: selectedSeason,
                  })}
                </caption>
                <thead className="sticky top-0 z-10 bg-[#15151e] text-white shadow-lg shadow-black/10">
                  <tr>
                    <th className={numericHeaderClass}>
                      {t("raceResults.classification.columns.position")}
                    </th>
                    <th className={headerClass}>
                      {t("raceResults.classification.columns.driver")}
                    </th>
                    <th className={headerClass}>
                      {t("raceResults.classification.columns.constructor")}
                    </th>
                    <th className={headerClass}>
                      {t("raceResults.classification.columns.timeStatus")}
                    </th>
                    <th
                      className={numericHeaderClass}
                      aria-sort={fastestLapSortState}
                    >
                      <button
                        type="button"
                        onClick={() => toggleResultsSort("fastest-lap")}
                        aria-label={getSortButtonLabel(
                          resultsSortOrder,
                          "fastest-lap",
                          t
                        )}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1 text-center transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      >
                        <span>{t("raceResults.classification.columns.fastestLap")}</span>
                        <span aria-hidden="true" className="text-[0.7rem]">
                          {fastestLapSortState === "ascending"
                            ? "▲"
                            : fastestLapSortState === "descending"
                              ? "▼"
                              : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className={numericHeaderClass}>
                      {t("raceResults.classification.columns.tireStrategy")}
                    </th>
                    <th
                      className={numericHeaderClass}
                      aria-sort={fastestPitStopSortState}
                    >
                      <button
                        type="button"
                        onClick={() => toggleResultsSort("fastest-pit-stop")}
                        aria-label={getSortButtonLabel(
                          resultsSortOrder,
                          "fastest-pit-stop",
                          t
                        )}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1 text-center transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      >
                        <span>
                          {t("raceResults.classification.columns.fastestPitStop")}
                        </span>
                        <span aria-hidden="true" className="text-[0.7rem]">
                          {fastestPitStopSortState === "ascending"
                            ? "▲"
                            : fastestPitStopSortState === "descending"
                              ? "▼"
                              : "↕"}
                        </span>
                      </button>
                    </th>
                    <th className={numericHeaderClass}>
                      {t("raceResults.classification.columns.points")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--background-buttons)">
                  {sortedResults.map((result) => {
                    const isFastestLap =
                      result.Driver.driverId ===
                      fastestLapDriver?.Driver.driverId;
                    const medal = getPositionMedal(result.position);
                    const fastestPitStop = fastestPitStopsByDriver.get(
                      result.Driver.driverId
                    );
                    const tireStrategy = pitStopStrategiesByDriver.get(
                      result.Driver.driverId
                    );
                    const pitStopMeta = getPitStopMeta(fastestPitStop, t);
                    const fastestLapMeta = getFastestLapMeta(result.FastestLap, t);
                    const gridVersusFinishLabel =
                      getGridVersusFinishLabel(result, t);

                    return (
                      <tr
                        key={result.position}
                        tabIndex={0}
                        aria-label={t("raceResults.classification.rowAriaLabel", {
                          driverName:
                            getDriverFullName(result.Driver) ||
                            getDriverLabel(result.Driver),
                        })}
                        onClick={handleRowClick(result.Driver.driverId)}
                        onKeyDown={handleRowKeyDown(result.Driver.driverId)}
                        className={`group cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-px hover:bg-(--background-buttons) hover:shadow-lg hover:shadow-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e10600] focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color) ${
                          isFastestLap
                            ? "bg-purple-500/10"
                            : "odd:bg-(--background-color) even:bg-(--background-color2)"
                        }`}
                      >
                        <td className={numericCellClass}>
                          <div className="inline-flex flex-col items-center gap-2">
                            <span
                              className={`inline-flex min-w-14 items-center justify-center gap-1 rounded-full border px-3 py-1 text-sm font-black shadow-sm ${getPositionAccentClass(
                                result.position
                              )}`}
                            >
                              {medal && <span aria-hidden="true">{medal}</span>}
                              <span>{result.position}</span>
                            </span>
                            <span className="text-center text-[0.68rem] font-bold uppercase tracking-[0.14em] text-(--text-color2)">
                              {gridVersusFinishLabel}
                            </span>
                          </div>
                        </td>
                        <td className={cellClass}>
                          <div className="flex min-w-0 items-center gap-3">
                            {renderDriverName(result.Driver, isFastestLap)}
                            {isFastestLap && (
                              <span className="rounded-full bg-purple-600 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white shadow-sm">
                                {t("raceResults.classification.fastestLapBadge")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`${cellClass} text-(--text-color2)`}>
                          {result.Constructor?.name ?? t("raceResults.constructorTbc")}
                        </td>
                        <td className={cellClass}>
                          <span className="inline-flex rounded-full bg-(--background-buttons) px-3 py-1 font-bold tabular-nums text-(--text-color) shadow-sm">
                            {result.Time ? result.Time.time : result.status}
                          </span>
                        </td>
                        <td className={numericCellClass}>
                          {result.FastestLap?.Time?.time ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="rounded-full bg-purple-500/12 px-3 py-1 font-black tabular-nums text-purple-700 shadow-sm">
                                {result.FastestLap.Time.time}
                              </span>
                              {fastestLapMeta && (
                                <span className="text-xs text-(--text-color2)">
                                  {fastestLapMeta}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-(--text-color2)">—</span>
                          )}
                        </td>
                        <td className={numericCellClass}>
                          {tireStrategy && tireStrategy.length > 0 ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="rounded-full bg-sky-500/12 px-3 py-1 font-black text-sky-700 shadow-sm">
                                {getTireStrategyStopLabel(tireStrategy, t)}
                              </span>
                              <span className="text-xs text-(--text-color2)">
                                {getTireStrategyLapSummary(tireStrategy, t)}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-1 text-(--text-color2)">
                              <span className="font-semibold">
                                {t("raceResults.classification.noStops")}
                              </span>
                              <span className="text-xs">
                                {t("raceResults.classification.strategyUnavailable")}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className={numericCellClass}>
                          {fastestPitStop?.duration ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="rounded-full bg-emerald-500/12 px-3 py-1 font-black tabular-nums text-emerald-700 shadow-sm">
                                {fastestPitStop.duration}s
                              </span>
                              {pitStopMeta && (
                                <span className="text-xs text-(--text-color2)">
                                  {pitStopMeta}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-(--text-color2)">—</span>
                          )}
                        </td>
                        <td className={numericCellClass}>
                          <span className="inline-flex items-baseline justify-center gap-1 rounded-full bg-[#e10600]/10 px-3 py-1 font-black text-[#e10600] shadow-sm">
                            <span>{result.points}</span>
                            <span className="text-[0.65rem] uppercase tracking-[0.12em]">
                              {t("raceResults.classification.pointsAbbreviation")}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default RaceResultsPage;
export type { RaceResult, RaceResultDriver, SprintResult };
