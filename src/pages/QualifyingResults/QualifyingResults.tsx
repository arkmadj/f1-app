import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useQualifyingResults, useRacePitStops } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import QualifyingResultsPageSkeleton from "./QualifyingResultsPageSkeleton";
import type { PitStop, QualifyingResult } from "../../services/api/racesApi";
import type { TFunction } from "i18next";

const NOT_AVAILABLE = "—";
const EMPTY_RESULTS: QualifyingResult[] = [];

type QualifyingSession = "Q1" | "Q2" | "Q3";
type QualifyingTimelineEventType = "benchmark" | "cutoff" | "pole";
type QualifyingSortOrder =
  | "classification"
  | `${QualifyingSession}-asc`
  | `${QualifyingSession}-desc`;
type DriverPitStopStrategyMap = Map<string, PitStop[]>;
type QualifyingTimelineEvent = {
  constructorName: string;
  context: string;
  driverId: string;
  driverLabel: string;
  headline: string;
  highlight: string;
  id: string;
  label: string;
  order: number;
  session: QualifyingSession;
  summary: string;
  type: QualifyingTimelineEventType;
};

const surfaceClass =
  "border border-[rgba(196,32,33,0.16)] bg-(--navbar-background) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";

const tableHeaderClass =
  "px-4 pb-2 text-left text-xs uppercase tracking-[0.06em] text-(--text-color3)";

const tableCellClass =
  "bg-(--background-color) px-4 py-4 align-middle transition-colors duration-200 first:rounded-l-2xl last:rounded-r-2xl group-hover:bg-(--background-buttons-hover)";

const getColumnSortState = (
  sortOrder: QualifyingSortOrder,
  session: QualifyingSession
): "none" | "ascending" | "descending" => {
  if (sortOrder === `${session}-asc`) return "ascending";
  if (sortOrder === `${session}-desc`) return "descending";
  return "none";
};

const getSortButtonLabel = (args: {
  sortOrder: QualifyingSortOrder;
  session: QualifyingSession;
  t: TFunction;
}): string => {
  const { sortOrder, session, t } = args;
  const sortState = getColumnSortState(sortOrder, session);

  if (sortState === "none") {
    return t("qualifyingResults.sort.fastestFirst", { session });
  }
  if (sortState === "ascending") {
    return t("qualifyingResults.sort.slowestFirst", { session });
  }
  return t("qualifyingResults.sort.reset");
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

const compareOptionalLapTimes = (
  left: number | null,
  right: number | null,
  direction: 1 | -1
): number => {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  return direction * (left - right);
};

const parseQualifyingPosition = (value?: string): number | null => {
  const position = Number.parseInt(value ?? "", 10);
  return Number.isFinite(position) && position > 0 ? position : null;
};

const getResultByPosition = (
  results: readonly QualifyingResult[],
  targetPosition: number
): QualifyingResult | undefined =>
  results.find(
    (result) => parseQualifyingPosition(result.position) === targetPosition
  );

const getFastestSessionResult = (
  results: readonly QualifyingResult[],
  session: QualifyingSession
): QualifyingResult | undefined =>
  [...results]
    .filter((result) => Boolean(result[session]))
    .sort((left, right) => {
      const lapTimeDifference = compareOptionalLapTimes(
        parseLapTimeToMilliseconds(left[session]),
        parseLapTimeToMilliseconds(right[session]),
        1
      );
      if (lapTimeDifference !== 0) return lapTimeDifference;

      return (
        (parseQualifyingPosition(left.position) ?? Number.MAX_SAFE_INTEGER) -
        (parseQualifyingPosition(right.position) ?? Number.MAX_SAFE_INTEGER)
      );
    })[0];

const formatTimelineGap = (gapMilliseconds: number, t: TFunction): string =>
  t("qualifyingResults.timeline.gapValue", {
    gap: (gapMilliseconds / 1000).toFixed(3),
  });

const buildCutoffTimelineEvent = ({
  advancingPosition,
  eliminatedPosition,
  nextSession,
  order,
  results,
  session,
  t,
}: {
  advancingPosition: number;
  eliminatedPosition: number;
  nextSession: Exclude<QualifyingSession, "Q1">;
  order: number;
  results: readonly QualifyingResult[];
  session: Extract<QualifyingSession, "Q1" | "Q2">;
  t: TFunction;
}): QualifyingTimelineEvent | null => {
  const advancingResult = getResultByPosition(results, advancingPosition);
  const advancingTime = advancingResult?.[session];
  if (!advancingResult || !advancingTime) return null;

  const eliminatedResult = getResultByPosition(results, eliminatedPosition);
  const advancingTimeMilliseconds = parseLapTimeToMilliseconds(advancingTime);
  const eliminatedTimeMilliseconds = parseLapTimeToMilliseconds(
    eliminatedResult?.[session]
  );
  const gapMilliseconds =
    advancingTimeMilliseconds !== null && eliminatedTimeMilliseconds !== null
      ? Math.max(eliminatedTimeMilliseconds - advancingTimeMilliseconds, 0)
      : null;
  const driverLabel = getDriverName(advancingResult.Driver);
  const eliminatedCount = results.filter((result) => {
    const position = parseQualifyingPosition(result.position);
    return position !== null && position > advancingPosition;
  }).length;

  return {
    constructorName: advancingResult.Constructor.name,
    context: t("qualifyingResults.timeline.cutoff.context", {
      count: eliminatedCount,
      position: advancingPosition,
    }),
    driverId: advancingResult.Driver.driverId,
    driverLabel,
    headline: t("qualifyingResults.timeline.cutoff.headline", {
      driver: driverLabel,
      nextSession,
    }),
    highlight:
      gapMilliseconds !== null && gapMilliseconds > 0
        ? formatTimelineGap(gapMilliseconds, t)
        : advancingTime,
    id: `qualifying-timeline-cutoff-${session.toLowerCase()}-${advancingResult.Driver.driverId}`,
    label: t("qualifyingResults.timeline.labels.cutoff"),
    order,
    session,
    summary:
      eliminatedResult?.[session] && gapMilliseconds !== null && gapMilliseconds > 0
        ? t("qualifyingResults.timeline.cutoff.summaryWithGap", {
            driver: driverLabel,
            eliminatedDriver: getDriverName(eliminatedResult.Driver),
            gap: (gapMilliseconds / 1000).toFixed(3),
            nextSession,
            time: advancingTime,
          })
        : t("qualifyingResults.timeline.cutoff.summary", {
            driver: driverLabel,
            nextSession,
            time: advancingTime,
          }),
    type: "cutoff",
  };
};

const buildQualifyingTimelineEvents = (
  results: readonly QualifyingResult[],
  t: TFunction
): QualifyingTimelineEvent[] => {
  if (results.length === 0) return [];

  const events: QualifyingTimelineEvent[] = [];
  const q1Benchmark = getFastestSessionResult(results, "Q1");
  const q2Benchmark = getFastestSessionResult(results, "Q2");
  const poleSitter = getFastestSessionResult(results, "Q3");
  const q1Cutoff = buildCutoffTimelineEvent({
    advancingPosition: 15,
    eliminatedPosition: 16,
    nextSession: "Q2",
    order: 2,
    results,
    session: "Q1",
    t,
  });
  const q2Cutoff = buildCutoffTimelineEvent({
    advancingPosition: 10,
    eliminatedPosition: 11,
    nextSession: "Q3",
    order: 4,
    results,
    session: "Q2",
    t,
  });

  if (q1Benchmark?.Q1) {
    const driverLabel = getDriverName(q1Benchmark.Driver);
    events.push({
      constructorName: q1Benchmark.Constructor.name,
      context: t("qualifyingResults.timeline.benchmark.context"),
      driverId: q1Benchmark.Driver.driverId,
      driverLabel,
      headline: t("qualifyingResults.timeline.benchmark.headline", {
        driver: driverLabel,
        session: "Q1",
      }),
      highlight: q1Benchmark.Q1,
      id: `qualifying-timeline-benchmark-q1-${q1Benchmark.Driver.driverId}`,
      label: t("qualifyingResults.timeline.labels.benchmark"),
      order: 1,
      session: "Q1",
      summary: t("qualifyingResults.timeline.benchmark.summary", {
        constructor: q1Benchmark.Constructor.name,
        driver: driverLabel,
        session: "Q1",
        time: q1Benchmark.Q1,
      }),
      type: "benchmark",
    });
  }

  if (q1Cutoff) {
    events.push(q1Cutoff);
  }

  if (q2Benchmark?.Q2) {
    const driverLabel = getDriverName(q2Benchmark.Driver);
    events.push({
      constructorName: q2Benchmark.Constructor.name,
      context: t("qualifyingResults.timeline.benchmark.context"),
      driverId: q2Benchmark.Driver.driverId,
      driverLabel,
      headline: t("qualifyingResults.timeline.benchmark.headline", {
        driver: driverLabel,
        session: "Q2",
      }),
      highlight: q2Benchmark.Q2,
      id: `qualifying-timeline-benchmark-q2-${q2Benchmark.Driver.driverId}`,
      label: t("qualifyingResults.timeline.labels.benchmark"),
      order: 3,
      session: "Q2",
      summary: t("qualifyingResults.timeline.benchmark.summary", {
        constructor: q2Benchmark.Constructor.name,
        driver: driverLabel,
        session: "Q2",
        time: q2Benchmark.Q2,
      }),
      type: "benchmark",
    });
  }

  if (q2Cutoff) {
    events.push(q2Cutoff);
  }

  if (poleSitter?.Q3) {
    const driverLabel = getDriverName(poleSitter.Driver);
    const topThree = [1, 2, 3]
      .map((position) => getResultByPosition(results, position))
      .filter((result): result is QualifyingResult => Boolean(result))
      .map((result) => getDriverName(result.Driver))
      .join(" · ");

    events.push({
      constructorName: poleSitter.Constructor.name,
      context: t("qualifyingResults.timeline.pole.context", { topThree }),
      driverId: poleSitter.Driver.driverId,
      driverLabel,
      headline: t("qualifyingResults.timeline.pole.headline", {
        driver: driverLabel,
      }),
      highlight: poleSitter.Q3,
      id: `qualifying-timeline-pole-${poleSitter.Driver.driverId}`,
      label: t("qualifyingResults.timeline.labels.pole"),
      order: 5,
      session: "Q3",
      summary: t("qualifyingResults.timeline.pole.summary", {
        constructor: poleSitter.Constructor.name,
        driver: driverLabel,
        time: poleSitter.Q3,
      }),
      type: "pole",
    });
  }

  return events.sort((left, right) => left.order - right.order);
};

const sortPitStopsByStrategyOrder = (pitStops: readonly PitStop[]): PitStop[] =>
  [...pitStops].sort((left, right) => {
    const stopDifference = Number(left.stop ?? 0) - Number(right.stop ?? 0);
    if (stopDifference !== 0) return stopDifference;

    return Number(left.lap ?? 0) - Number(right.lap ?? 0);
  });

const getLocalizedCompoundKey = (compound: string): string | null => {
  switch (compound.replace(/[_\-\s]+/g, "").toLowerCase()) {
    case "soft":
      return "soft";
    case "medium":
      return "medium";
    case "hard":
      return "hard";
    case "intermediate":
      return "intermediate";
    case "wet":
      return "wet";
    case "supersoft":
      return "superSoft";
    case "ultrasoft":
      return "ultraSoft";
    case "hypersoft":
      return "hyperSoft";
    default:
      return null;
  }
};

const formatCompoundName = (compound: string, t: TFunction): string => {
  const localizedCompoundKey = getLocalizedCompoundKey(compound);

  if (localizedCompoundKey) {
    return t(`qualifyingResults.tireCompounds.${localizedCompoundKey}`);
  }

  return compound
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
};

const getPitStopCompound = (
  pitStop: PitStop,
  t: TFunction
): string | null => {
  const compound =
    pitStop.compound ??
    pitStop.tireCompound ??
    pitStop.tyreCompound ??
    pitStop.tire?.compound ??
    pitStop.tyre?.compound;

  return compound ? formatCompoundName(compound, t) : null;
};

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
): string =>
  t("qualifyingResults.tireStrategy.stops", { count: pitStops.length });

const getTireStrategyLapSummary = (
  pitStops: readonly PitStop[],
  t: TFunction
): string => {
  const stopLaps = pitStops
    .map((pitStop) => pitStop.lap)
    .filter((lap): lap is string => Boolean(lap));

  return stopLaps.length > 0
    ? t("qualifyingResults.tireStrategy.laps", { laps: stopLaps.join(" / ") })
    : t("qualifyingResults.tireStrategy.lapDataTbc");
};

const getTireStrategyContent = (
  pitStops: readonly PitStop[],
  t: TFunction
): { primary: string; secondary: string; muted?: boolean } => {
  if (pitStops.length === 0) {
    return {
      primary: t("qualifyingResults.tireStrategy.noStops"),
      secondary: t("qualifyingResults.tireStrategy.unavailable"),
      muted: true,
    };
  }

  const compounds = pitStops
    .map((pitStop) => getPitStopCompound(pitStop, t))
    .filter((compound): compound is string => Boolean(compound));
  const lapSummary = getTireStrategyLapSummary(pitStops, t);
  const stopLabel = getTireStrategyStopLabel(pitStops, t);

  if (compounds.length > 0) {
    return {
      primary: compounds.join(" → "),
      secondary: `${stopLabel} · ${lapSummary}`,
    };
  }

  return {
    primary: stopLabel,
    secondary: t("qualifyingResults.tireStrategy.compoundUnavailable", {
      lapSummary,
    }),
  };
};

const escapeCsvValue = (value: string): string => {
  const normalizedValue = value.replace(/\r?\n/g, " ");
  if (!/[",\r\n]/.test(normalizedValue)) return normalizedValue;

  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const getExportDriverLabel = (driver: QualifyingResult["Driver"]): string =>
  `${getDriverCode(driver)} - ${getDriverName(driver)}`;

const getExportTireStrategy = (
  pitStops: readonly PitStop[],
  t: TFunction
): string => {
  const tireStrategy = getTireStrategyContent(pitStops, t);

  return `${tireStrategy.primary} (${tireStrategy.secondary})`;
};

const buildQualifyingResultsCsv = (
  results: readonly QualifyingResult[],
  pitStopStrategiesByDriver: ReadonlyMap<string, readonly PitStop[]>,
  t: TFunction
): string => {
  const headers = [
    t("qualifyingResults.columns.position"),
    t("qualifyingResults.columns.driver"),
    t("qualifyingResults.columns.constructor"),
    "Q1",
    "Q2",
    "Q3",
    t("qualifyingResults.columns.tireStrategy"),
  ];

  const rows = results.map((result) => [
    result.position,
    getExportDriverLabel(result.Driver),
    result.Constructor.name,
    result.Q1 ?? NOT_AVAILABLE,
    result.Q2 ?? NOT_AVAILABLE,
    result.Q3 ?? NOT_AVAILABLE,
    getExportTireStrategy(
      pitStopStrategiesByDriver.get(result.Driver.driverId) ?? [],
      t
    ),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

const getQualifyingResultsExportFilename = (
  season: string,
  round: string
): string => `${season}-round-${round}-qualifying-results.csv`;

const sortQualifyingResults = (
  results: readonly QualifyingResult[],
  sortOrder: QualifyingSortOrder
): QualifyingResult[] => {
  if (sortOrder === "classification") return [...results];

  const session = sortOrder.slice(0, 2) as QualifyingSession;
  const direction: 1 | -1 = sortOrder.endsWith("-asc") ? 1 : -1;

  return [...results].sort((left, right) => {
    const lapTimeDifference = compareOptionalLapTimes(
      parseLapTimeToMilliseconds(left[session]),
      parseLapTimeToMilliseconds(right[session]),
      direction
    );
    if (lapTimeDifference !== 0) return lapTimeDifference;

    return Number(left.position) - Number(right.position);
  });
};

const getDriverCode = (driver: QualifyingResult["Driver"]): string =>
  driver.code ??
  driver.permanentNumber ??
  driver.familyName.slice(0, 3).toUpperCase();

const getDriverName = (driver: QualifyingResult["Driver"]): string =>
  `${driver.givenName} ${driver.familyName}`;

const getBestTime = (result: QualifyingResult | undefined): string =>
  result?.Q3 ?? result?.Q2 ?? result?.Q1 ?? NOT_AVAILABLE;

const renderSessionTime = (time?: string): JSX.Element => (
  <span
    className={`whitespace-nowrap font-['F1_Bold'] ${
      time ? "text-(--text-color)" : "text-(--text-color3)"
    }`}
  >
    {time ?? NOT_AVAILABLE}
  </span>
);

function QualifyingResultsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { round } = useParams({ from: "/qualifying/$round" });
  const { selectedSeason } = useSelectedSeason();
  const [sortOrder, setSortOrder] =
    useState<QualifyingSortOrder>("classification");
  const {
    data: qualifyingResultsData,
    isLoading,
    error,
  } = useQualifyingResults(round, selectedSeason);
  const { data: racePitStopsData } = useRacePitStops(round, selectedSeason);

  const results: QualifyingResult[] = qualifyingResultsData ?? EMPTY_RESULTS;
  const sortedResults = useMemo<QualifyingResult[]>(
    () => sortQualifyingResults(results, sortOrder),
    [results, sortOrder]
  );
  const qualifyingTimelineEvents = useMemo<QualifyingTimelineEvent[]>(
    () => buildQualifyingTimelineEvents(results, t),
    [results, t]
  );
  const pitStopStrategiesByDriver = useMemo(
    () => getPitStopStrategiesByDriver(racePitStopsData ?? []),
    [racePitStopsData]
  );
  const poleSitter =
    results.find((result) => result.position === "1") ?? results[0];

  useEffect(() => {
    document.title = t("qualifyingResults.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching qualifying results:", error);
    }
  }, [error]);

  const toggleSortOrder = (session: QualifyingSession): void => {
    setSortOrder((current) => {
      const ascendingOrder = `${session}-asc` as QualifyingSortOrder;
      const descendingOrder = `${session}-desc` as QualifyingSortOrder;

      if (current !== ascendingOrder && current !== descendingOrder) {
        return ascendingOrder;
      }
      if (current === ascendingOrder) return descendingOrder;
      return "classification";
    });
  };

  const handleExportResults = (): void => {
    const csv = buildQualifyingResultsCsv(
      sortedResults,
      pitStopStrategiesByDriver,
      t
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getQualifyingResultsExportFilename(selectedSeason, round);
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderSessionHeader = (session: QualifyingSession): JSX.Element => {
    const sortState = getColumnSortState(sortOrder, session);

    return (
      <th className={tableHeaderClass} scope="col" aria-sort={sortState}>
        <button
          type="button"
          onClick={() => toggleSortOrder(session)}
          aria-label={getSortButtonLabel({ sortOrder, session, t })}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-(--background-buttons-hover) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2"
        >
          <span>{session}</span>
          <span aria-hidden="true" className="text-[0.7rem]">
            {sortState === "ascending"
              ? "▲"
              : sortState === "descending"
                ? "▼"
                : "↕"}
          </span>
        </button>
      </th>
    );
  };

  if (isLoading) {
    return <QualifyingResultsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto my-8 max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-center font-['F1_Bold'] text-red-700">
        {t("qualifyingResults.error", { message: error.message })}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title={t("qualifyingResults.empty.title")}
        message={t("qualifyingResults.empty.message", {
          season: selectedSeason,
          round,
        })}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-[clamp(1rem,3vw,2rem)] py-[clamp(1rem,3vw,2rem)] max-[600px]:px-3">
      <section
        className={`${surfaceClass} flex items-center justify-between gap-6 rounded-3xl p-[clamp(1.25rem,4vw,2rem)] max-[760px]:flex-col max-[760px]:items-start`}
        aria-labelledby="qualifying-title"
      >
        <div>
          <p className="mb-2.5 font-['F1_Bold'] text-xs uppercase tracking-widest text-(--color1)">
            {t("qualifyingResults.eyebrow", { season: selectedSeason })}
          </p>
          <h1
            id="qualifying-title"
            className="mb-3 font-['F1_Bold'] text-[clamp(1.8rem,4vw,3.25rem)] leading-[1.05] text-(--text-color)"
          >
            {t("qualifyingResults.heading", { round })}
          </h1>
          <p className="max-w-2xl leading-relaxed text-(--text-color2)">
            {t("qualifyingResults.description")}
          </p>
        </div>
        <Link
          className="inline-flex min-w-48 items-center justify-center rounded-full bg-(--color1) px-5 py-3.5 font-['F1_Bold'] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--color2) hover:text-white focus-visible:-translate-y-0.5 focus-visible:bg-(--color2) focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2 max-[760px]:w-full"
          to="/race/$race"
          params={{ race: round }}
          search={seasonSearchParams(selectedSeason)}
        >
          {t("qualifyingResults.viewRaceResults")}
        </Link>
      </section>

      <ul
        className="my-4 grid list-none grid-cols-3 gap-4 p-0 max-[760px]:grid-cols-1"
        aria-label={t("qualifyingResults.summaryAriaLabel")}
      >
        <li
          className={`${surfaceClass} flex flex-col gap-2 rounded-[18px] p-4`}
        >
          <span className="text-xs uppercase tracking-wide text-(--text-color3)">
            {t("qualifyingResults.summary.entrants")}
          </span>
          <strong className="font-['F1_Bold'] text-[clamp(1.1rem,2vw,1.5rem)] text-(--text-color)">
            {results.length}
          </strong>
        </li>
        <li
          className={`${surfaceClass} flex flex-col gap-2 rounded-[18px] p-4`}
        >
          <span className="text-xs uppercase tracking-wide text-(--text-color3)">
            {t("qualifyingResults.summary.poleSitter")}
          </span>
          <strong className="font-['F1_Bold'] text-[clamp(1.1rem,2vw,1.5rem)] text-(--text-color)">
            {poleSitter ? getDriverName(poleSitter.Driver) : NOT_AVAILABLE}
          </strong>
        </li>
        <li
          className={`${surfaceClass} flex flex-col gap-2 rounded-[18px] p-4`}
        >
          <span className="text-xs uppercase tracking-wide text-(--text-color3)">
            {t("qualifyingResults.summary.poleTime")}
          </span>
          <strong className="font-['F1_Bold'] text-[clamp(1.1rem,2vw,1.5rem)] text-(--text-color)">
            {getBestTime(poleSitter)}
          </strong>
        </li>
      </ul>

      {qualifyingTimelineEvents.length > 0 && (
        <section
          aria-label={t("qualifyingResults.timeline.ariaLabel")}
          className={`${surfaceClass} mb-4 rounded-[22px] p-6 max-[600px]:px-4`}
        >
          <div className="flex items-start justify-between gap-4 max-[760px]:flex-col">
            <div>
              <p className="text-xs font-['F1_Bold'] uppercase tracking-[0.2em] text-(--color1)">
                {t("qualifyingResults.timeline.eyebrow")}
              </p>
              <h2 className="mt-2 font-['F1_Bold'] text-[clamp(1.3rem,2.3vw,1.9rem)] text-(--text-color)">
                {t("qualifyingResults.timeline.heading")}
              </h2>
              <p className="mt-2 max-w-3xl leading-relaxed text-(--text-color2)">
                {t("qualifyingResults.timeline.description")}
              </p>
            </div>
            <p className="inline-flex rounded-full bg-(--background-buttons) px-4 py-2 text-sm font-['F1_Bold'] text-(--text-color)">
              {t("qualifyingResults.timeline.momentsCaptured", {
                count: qualifyingTimelineEvents.length,
              })}
            </p>
          </div>

          <ol className="mt-6 list-none p-0">
            {qualifyingTimelineEvents.map((event, index) => (
              <li key={event.id} className="relative pb-4 pl-6 last:pb-0">
                {index < qualifyingTimelineEvents.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[0.34rem] top-8 bottom-0 w-px bg-(--button-background)"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-5 h-3 w-3 rounded-full bg-(--color1) shadow-[0_0_0_6px_rgba(225,6,0,0.08)]"
                />

                <article className="rounded-3xl border border-(--button-background) bg-(--background-color) p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-['F1_Bold'] uppercase tracking-[0.18em] text-(--color1)">
                        {event.session} · {event.label}
                      </p>
                      <h3 className="mt-2 font-['F1_Bold'] text-[clamp(1.12rem,2vw,1.5rem)] text-(--text-color)">
                        {event.headline}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-color2)">
                        {event.summary}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-(--background-buttons) px-4 py-3 lg:min-w-44">
                      <p className="text-xs uppercase tracking-[0.14em] text-(--text-color3)">
                        {t("qualifyingResults.timeline.highlightLabel")}
                      </p>
                      <p className="mt-1 font-['F1_Bold'] text-lg text-(--text-color)">
                        {event.highlight}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-(--text-color2)">
                    <Link
                      className="inline-flex items-center rounded-full bg-(--background-buttons) px-3 py-1.5 text-(--text-color) transition-colors duration-200 hover:text-(--color1) focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2"
                      to="/driver/$id"
                      params={{ id: event.driverId }}
                      search={seasonSearchParams(selectedSeason)}
                    >
                      {event.driverLabel}
                    </Link>
                    <span className="inline-flex items-center rounded-full bg-(--background-buttons) px-3 py-1.5">
                      {event.constructorName}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-(--background-buttons) px-3 py-1.5">
                      {event.context}
                    </span>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section
        className={`${surfaceClass} overflow-hidden rounded-[22px]`}
        aria-labelledby="classification-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 max-[600px]:flex-col max-[600px]:px-4">
          <div>
            <h2
              id="classification-title"
              className="mb-1.5 font-['F1_Bold'] text-[clamp(1.25rem,2vw,1.7rem)] text-(--text-color)"
            >
              {t("qualifyingResults.classification.heading")}
            </h2>
            <p className="leading-relaxed text-(--text-color2)">
              {t("qualifyingResults.classification.description", {
                notAvailable: NOT_AVAILABLE,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportResults}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-(--color1) px-4 py-2.5 font-['F1_Bold'] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--color2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2 max-[600px]:w-full"
            aria-label={t("qualifyingResults.exportAriaLabel", {
              season: selectedSeason,
              round,
            })}
          >
            {t("qualifyingResults.exportCsv")}
          </button>
        </div>
        <div className="overflow-x-auto p-5 max-[600px]:px-4">
          <table className="w-full min-w-[980px] border-separate border-spacing-x-0 border-spacing-y-[0.55rem]">
            <thead>
              <tr>
                <th className={tableHeaderClass} scope="col">
                  {t("qualifyingResults.columns.positionShort")}
                </th>
                <th className={tableHeaderClass} scope="col">
                  {t("qualifyingResults.columns.driver")}
                </th>
                <th className={tableHeaderClass} scope="col">
                  {t("qualifyingResults.columns.constructor")}
                </th>
                {renderSessionHeader("Q1")}
                {renderSessionHeader("Q2")}
                {renderSessionHeader("Q3")}
                <th className={tableHeaderClass} scope="col">
                  {t("qualifyingResults.columns.tireStrategy")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => {
                const isPole = result.position === "1";
                const tireStrategy = getTireStrategyContent(
                  pitStopStrategiesByDriver.get(result.Driver.driverId) ?? [],
                  t
                );

                return (
                  <tr
                    key={`${result.position}-${result.Driver.driverId}`}
                    className={`group ${
                      isPole
                        ? "[&>td]:shadow-[inset_0_0_0_1px_rgba(196,32,33,0.2)]"
                        : ""
                    }`}
                  >
                    <td className={tableCellClass}>
                      <span
                        className={`inline-flex h-8 min-w-11 items-center justify-center rounded-full font-['F1_Bold'] ${
                          isPole
                            ? "bg-(--color1) text-white"
                            : "bg-(--background-buttons) text-(--text-color)"
                        }`}
                      >
                        {result.position}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <Link
                        className="inline-flex items-center gap-3 text-(--text-color) transition-colors duration-200 hover:text-(--color1) focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2"
                        to="/driver/$id"
                        params={{ id: result.Driver.driverId }}
                        search={seasonSearchParams(selectedSeason)}
                        aria-label={`${getDriverCode(result.Driver)} ${getDriverName(result.Driver)}`}
                      >
                        <span className="min-w-14 rounded-lg border-l-4 border-(--color1) bg-(--background-buttons) px-2 py-1.5 text-center font-['F1_Bold'] text-(--text-color)">
                          {getDriverCode(result.Driver)}
                        </span>
                        <span className="text-(--text-color2)">
                          {getDriverName(result.Driver)}
                        </span>
                      </Link>
                    </td>
                    <td className={`${tableCellClass} text-(--text-color2)`}>
                      {result.Constructor.name}
                    </td>
                    <td className={tableCellClass}>
                      {renderSessionTime(result.Q1)}
                    </td>
                    <td className={tableCellClass}>
                      {renderSessionTime(result.Q2)}
                    </td>
                    <td className={tableCellClass}>
                      {renderSessionTime(result.Q3)}
                    </td>
                    <td className={tableCellClass}>
                      <div
                        className={`inline-flex flex-col gap-1 ${
                          tireStrategy.muted ? "text-(--text-color2)" : ""
                        }`}
                      >
                        <span className="font-['F1_Bold'] text-(--text-color)">
                          {tireStrategy.primary}
                        </span>
                        <span className="text-xs text-(--text-color2)">
                          {tireStrategy.secondary}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default QualifyingResultsPage;
