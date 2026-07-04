import { useEffect, useMemo, useState } from "react";
import Flag from "react-world-flags";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import { nationalityCountryCode } from "../../domain/f1/images";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import teamColorClass from "../../domain/f1/teamColorClass";
import { Link } from "@tanstack/react-router";
import {
  useAllQualifyingResults,
  useAllRaceResults,
  useAllSprintResults,
  useDriverStandings,
  useDriverStandingsTimeline,
} from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";
import type { DriverStandingsTimelineRound } from "../../services/api/testapi";
import type {
  QualifyingRaceWithResults,
  RaceResult,
  RaceWithResults,
  SprintRaceWithResults,
} from "../../services/api/racesApi";

// ---------------------------------------------------------------------------
// Ergast / Jolpica driver standings response shape
// ---------------------------------------------------------------------------

export interface ErgastDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality: string;
}

export interface ErgastConstructor {
  constructorId: string;
  url?: string;
  name: string;
  nationality?: string;
}

export interface DriverStanding {
  position: string;
  positionText?: string;
  points: string;
  wins?: string;
  Driver: ErgastDriver;
  Constructors: ErgastConstructor[];
}

export interface StandingsList {
  season: string;
  round: string;
  DriverStandings: DriverStanding[];
}

export interface StandingsTable {
  season?: string;
  StandingsLists: StandingsList[];
}

export interface DriverStandingsResponse {
  MRData: {
    StandingsTable: StandingsTable;
  };
}

// ---------------------------------------------------------------------------
// `teamColorClass` only covers a subset of teams, so every lookup is treated
// as potentially `undefined`. `nationalityCountryCode` is already strictly
// typed and returns `""` for unknown nationalities.
// ---------------------------------------------------------------------------

const colorClasses = teamColorClass as Record<string, string | undefined>;

const chartCardClass =
  "rounded-[1.75rem] border border-(--background-color2) bg-(--background-buttons) p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] min-[900px]:p-6";
const statLabelClass =
  "text-[0.68rem] font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";
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
  "#7cb342",
  "#00897b",
];

interface DriverProgressionPoint {
  round: string;
  raceName: string;
  date?: string;
  position: number;
  positionLabel: string;
  points: number;
}

interface DriverProgressionSeries {
  driverId: string;
  driverName: string;
  familyName: string;
  currentPosition: number;
  color: string;
  points: DriverProgressionPoint[];
}

interface DriverStandingWithGap {
  standing: DriverStanding;
  gapToLeader: number;
  gapToAhead: number | null;
  positionChange: number | null;
}

const parseNumber = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapeCsvValue = (value: string): string => {
  const normalizedValue = value.replace(/\r?\n/g, " ");
  if (!/[",\r\n]/.test(normalizedValue)) return normalizedValue;

  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const formatGap = (gap: number | null, language: string): string => {
  if (gap === null) {
    return "—";
  }

  if (gap === 0) {
    return "0";
  }

  return `+${gap.toLocaleString(language)}`;
};

const sortByRound = <T extends { round: string }>(items: T[]): T[] =>
  [...items].sort(
    (left, right) => parseNumber(left.round) - parseNumber(right.round)
  );

const driverName = (
  driver: Pick<ErgastDriver, "givenName" | "familyName">
): string => `${driver.givenName} ${driver.familyName}`.trim();

const getDriverPositionChanges = (
  currentDrivers: readonly DriverStanding[],
  timeline: readonly DriverStandingsTimelineRound[]
): Map<string, number> => {
  const positionChanges = new Map<string, number>();
  const sortedTimeline = sortByRound([...timeline]);
  const previousRound =
    sortedTimeline.length > 1 ? sortedTimeline[sortedTimeline.length - 2] : null;

  if (!previousRound) {
    return positionChanges;
  }

  const previousPositions = new Map<string, number>();
  previousRound.DriverStandings.forEach((standing, index) => {
    previousPositions.set(
      standing.Driver.driverId,
      parseNumber(standing.position) || index + 1
    );
  });

  currentDrivers.forEach((standing, index) => {
    const previousPosition = previousPositions.get(standing.Driver.driverId);

    if (previousPosition === undefined) {
      return;
    }

    const currentPosition = parseNumber(standing.position) || index + 1;
    positionChanges.set(
      standing.Driver.driverId,
      previousPosition - currentPosition
    );
  });

  return positionChanges;
};

const getPositionChangePresentation = (
  positionChange: number | null,
  t: TFunction
): { label: string; text: string; className: string } | null => {
  if (positionChange === null) {
    return null;
  }

  if (positionChange > 0) {
    return {
      label: t("driverStandings.positionChange.gained", {
        count: positionChange,
      }),
      text: `▲${positionChange}`,
      className:
        "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20",
    };
  }

  if (positionChange < 0) {
    return {
      label: t("driverStandings.positionChange.lost", {
        count: Math.abs(positionChange),
      }),
      text: `▼${Math.abs(positionChange)}`,
      className: "bg-red-500/12 text-red-700 ring-1 ring-red-500/20",
    };
  }

  return {
    label: t("driverStandings.positionChange.unchanged"),
    text: "—",
    className: "bg-(--background-color) text-(--text-color3) ring-1 ring-black/10",
  };
};

const buildDriverStandingsCsv = (
  driversWithGaps: readonly DriverStandingWithGap[],
  language: string,
  t: TFunction
): string => {
  const headers = [
    t("driverStandings.columns.position"),
    t("driverStandings.columns.driver"),
    t("driverStandings.columns.team"),
    t("driverStandings.columns.gapToLeader"),
    t("driverStandings.columns.gapToAhead"),
    t("driverStandings.columns.points"),
    t("driverStandings.columns.wins"),
  ];

  const rows = driversWithGaps.map(({ standing, gapToLeader, gapToAhead }) => [
    standing.position,
    driverName(standing.Driver),
    standing.Constructors[0]?.name ?? "—",
    formatGap(gapToLeader, language),
    formatGap(gapToAhead, language),
    standing.points || "0",
    standing.wins || "0",
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

const getDriverStandingsExportFilename = (season: string): string =>
  `${season}-driver-standings.csv`;

const getSeasonWinsLeader = (
  drivers: DriverStanding[]
): { holder: string; count: number } | undefined => {
  if (drivers.length === 0) {
    return undefined;
  }

  const leader = drivers.reduce<DriverStanding | null>(
    (currentLeader, driver) => {
      if (!currentLeader) {
        return driver;
      }

      return parseNumber(driver.wins) > parseNumber(currentLeader.wins)
        ? driver
        : currentLeader;
    },
    null
  );

  if (!leader) {
    return undefined;
  }

  return {
    holder: driverName(leader.Driver),
    count: parseNumber(leader.wins),
  };
};

const getSeasonPoleLeader = (
  qualifyingRaces: QualifyingRaceWithResults[]
): { holder: string; count: number } | undefined => {
  const poleCounts = new Map<
    string,
    { holder: string; count: number; firstPoleRound: number }
  >();

  qualifyingRaces.forEach((race) => {
    const poleSitter = race.results.find(
      (result) => parseNumber(result.position) === 1
    );

    if (!poleSitter) {
      return;
    }

    const driverId = poleSitter.Driver.driverId;
    const current = poleCounts.get(driverId);
    poleCounts.set(driverId, {
      holder: driverName(poleSitter.Driver),
      count: (current?.count ?? 0) + 1,
      firstPoleRound: current?.firstPoleRound ?? parseNumber(race.round),
    });
  });

  return [...poleCounts.values()].sort(
    (left, right) =>
      right.count - left.count || left.firstPoleRound - right.firstPoleRound
  )[0];
};

const getSeasonSprintWinsLeader = (
  sprintRaces: SprintRaceWithResults[]
): { holder: string; count: number } | undefined => {
  const sprintWinCounts = new Map<
    string,
    { holder: string; count: number; firstSprintWinRound: number }
  >();

  sprintRaces.forEach((race) => {
    const sprintWinner = race.results.find(
      (result) => parseNumber(result.position) === 1
    );

    if (!sprintWinner) {
      return;
    }

    const driverId = sprintWinner.Driver.driverId;
    const current = sprintWinCounts.get(driverId);
    sprintWinCounts.set(driverId, {
      holder: driverName(sprintWinner.Driver),
      count: (current?.count ?? 0) + 1,
      firstSprintWinRound:
        current?.firstSprintWinRound ?? parseNumber(race.round),
    });
  });

  return [...sprintWinCounts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.firstSprintWinRound - right.firstSprintWinRound
  )[0];
};

const getSeasonPodiumLeader = (
  races: RaceWithResults[]
): { holder: string; count: number } | undefined => {
  const podiumCounts = new Map<
    string,
    { holder: string; count: number; firstPodiumRound: number }
  >();

  races.forEach((race) => {
    race.results.forEach((result) => {
      const position = parseNumber(result.position);
      if (position < 1 || position > 3) {
        return;
      }

      const driverId = result.Driver.driverId;
      const current = podiumCounts.get(driverId);
      podiumCounts.set(driverId, {
        holder: driverName(result.Driver),
        count: (current?.count ?? 0) + 1,
        firstPodiumRound: current?.firstPodiumRound ?? parseNumber(race.round),
      });
    });
  });

  return [...podiumCounts.values()].sort(
    (left, right) =>
      right.count - left.count || left.firstPodiumRound - right.firstPodiumRound
  )[0];
};

const isDnfResult = (result: RaceResult): boolean => {
  const status = result.status?.trim().toLowerCase();

  if (!status) {
    return false;
  }

  if (status === "finished" || status === "disqualified") {
    return false;
  }

  if (/^\+[0-9]+ laps?$/.test(status)) {
    return false;
  }

  return !result.Time;
};

const getSeasonDnfLeader = (
  drivers: DriverStanding[],
  races: RaceWithResults[]
): { holder: string; count: number } | undefined => {
  const dnfCounts = new Map<string, number>();

  races.forEach((race) => {
    race.results.forEach((result) => {
      if (!isDnfResult(result)) {
        return;
      }

      const driverId = result.Driver.driverId;
      dnfCounts.set(driverId, (dnfCounts.get(driverId) ?? 0) + 1);
    });
  });

  return drivers.reduce<{ holder: string; count: number } | undefined>(
    (leader, driver) => {
      const count = dnfCounts.get(driver.Driver.driverId) ?? 0;

      if (count === 0 || (leader && count <= leader.count)) {
        return leader;
      }

      return { holder: driverName(driver.Driver), count };
    },
    undefined
  );
};

const formatRaceDate = (
  date: string | undefined,
  locale: string,
  unavailableLabel: string
): string => {
  if (!date) {
    return unavailableLabel;
  }

  const raceDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(raceDate.getTime())) {
    return date;
  }

  return raceDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const buildDriverProgression = (
  timeline: DriverStandingsTimelineRound[],
  currentDrivers: DriverStanding[]
): DriverProgressionSeries[] => {
  const sortedTimeline = sortByRound(timeline);
  const driverOrder = new Map<string, number>();

  currentDrivers.forEach((standing, index) => {
    driverOrder.set(standing.Driver.driverId, index + 1);
  });

  sortedTimeline.forEach((round) => {
    round.DriverStandings.forEach((standing) => {
      if (!driverOrder.has(standing.Driver.driverId)) {
        driverOrder.set(standing.Driver.driverId, driverOrder.size + 1);
      }
    });
  });

  const seriesByDriver = new Map<string, DriverProgressionSeries>();

  driverOrder.forEach((currentPosition, driverId) => {
    const currentStanding = currentDrivers.find(
      (standing) => standing.Driver.driverId === driverId
    );
    const firstTimelineStanding = sortedTimeline
      .flatMap((round) => round.DriverStandings)
      .find((standing) => standing.Driver.driverId === driverId);
    const driver = currentStanding?.Driver ?? firstTimelineStanding?.Driver;

    if (!driver) {
      return;
    }

    seriesByDriver.set(driverId, {
      driverId,
      driverName: driverName(driver),
      familyName: driver.familyName,
      currentPosition,
      color: chartPalette[(currentPosition - 1) % chartPalette.length],
      points: [],
    });
  });

  sortedTimeline.forEach((round) => {
    round.DriverStandings.forEach((standing, index) => {
      const series = seriesByDriver.get(standing.Driver.driverId);
      if (!series) {
        return;
      }

      const position = parseNumber(standing.position) || index + 1;
      series.points.push({
        round: round.round,
        raceName: round.raceName,
        date: round.date,
        position,
        positionLabel: standing.position ?? String(position),
        points: parseNumber(standing.points),
      });
    });
  });

  return [...seriesByDriver.values()]
    .filter((series) => series.points.length > 0)
    .sort((left, right) => left.currentPosition - right.currentPosition);
};

function DriverStandingsProgressionChart({
  timeline,
  currentDrivers,
  isLoading,
  isError,
}: {
  timeline: DriverStandingsTimelineRound[];
  currentDrivers: DriverStanding[];
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<string | null>(null);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const progression = useMemo(
    () => buildDriverProgression(timeline, currentDrivers),
    [currentDrivers, timeline]
  );
  const rounds = useMemo(
    () =>
      sortByRound(
        timeline.map((round) => ({
          round: round.round,
          raceName: round.raceName,
          date: round.date,
        }))
      ),
    [timeline]
  );

  if (isLoading) {
    return (
      <section
        className={`${chartCardClass} mt-6`}
        aria-labelledby="ranking-progression-title"
      >
        <h2
          id="ranking-progression-title"
          className="font-(--f1b) text-2xl text-(--text-color)"
        >
          {t("driverStandings.progression.heading")}
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          {t("driverStandings.progression.loading")}
        </p>
      </section>
    );
  }

  if (isError || progression.length === 0 || rounds.length === 0) {
    return (
      <section
        className={`${chartCardClass} mt-6`}
        aria-labelledby="ranking-progression-title"
      >
        <h2
          id="ranking-progression-title"
          className="font-(--f1b) text-2xl text-(--text-color)"
        >
          {t("driverStandings.progression.heading")}
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          {t("driverStandings.progression.unavailable")}
        </p>
      </section>
    );
  }

  const width = 760;
  const height = 360;
  const padding = { top: 24, right: 32, bottom: 64, left: 58 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxRank = Math.max(
    1,
    ...progression.flatMap((series) =>
      series.points.map((point) => point.position)
    )
  );
  const yTicks = Array.from(new Set([1, Math.ceil(maxRank / 2), maxRank]));
  const labelInterval = Math.max(1, Math.ceil(rounds.length / 8));
  const activeRoundData =
    rounds.find((round) => round.round === activeRound) ??
    rounds[rounds.length - 1];
  const getX = (round: string): number => {
    const index = Math.max(
      0,
      rounds.findIndex((roundData) => roundData.round === round)
    );
    return rounds.length === 1
      ? padding.left + innerWidth / 2
      : padding.left + (index / (rounds.length - 1)) * innerWidth;
  };
  const getY = (position: number): number =>
    maxRank === 1
      ? padding.top + innerHeight / 2
      : padding.top + ((position - 1) / (maxRank - 1)) * innerHeight;
  const activeX = activeRoundData ? getX(activeRoundData.round) : null;
  const activeStandings = progression
    .map((series) => ({
      series,
      point: series.points.find(
        (point) => point.round === activeRoundData?.round
      ),
    }))
    .filter(
      (
        entry
      ): entry is {
        series: DriverProgressionSeries;
        point: DriverProgressionPoint;
      } => Boolean(entry.point)
    )
    .sort((left, right) => left.point.position - right.point.position);

  return (
    <section
      className={`${chartCardClass} mt-6`}
      aria-labelledby="ranking-progression-title"
    >
      <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("driverStandings.progression.eyebrow")}
          </p>
          <h2
            id="ranking-progression-title"
            className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
          >
            {t("driverStandings.progression.heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          {t("driverStandings.progression.description")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-(--f1b) text-(--text-color2)">
        {progression.map((series) => (
          <span
            key={series.driverId}
            className="inline-flex items-center gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: series.color }}
              aria-hidden="true"
            />
            {series.familyName}
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl bg-(--background-color) p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("driverStandings.progression.chartAriaLabel")}
          className="min-w-3xl"
          onMouseLeave={() => {
            setActiveDriverId(null);
            setActiveRound(null);
          }}
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
                  className="fill-(--text-color3) text-[11px] font-(--f1r)"
                >
                  {t("driverStandings.progression.positionLabel", {
                    position: tick,
                  })}
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
          {progression.map((series) => {
            const line = series.points
              .map((point) => `${getX(point.round)},${getY(point.position)}`)
              .join(" ");
            const isDimmed =
              activeDriverId !== null && activeDriverId !== series.driverId;

            return (
              <polyline
                key={series.driverId}
                points={line}
                fill="none"
                stroke={series.color}
                strokeWidth={activeDriverId === series.driverId ? 4 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isDimmed ? 0.22 : 0.9}
              />
            );
          })}
          {progression.flatMap((series) =>
            series.points.map((point) => (
              <circle
                key={`${series.driverId}-${point.round}`}
                cx={getX(point.round)}
                cy={getY(point.position)}
                r={
                  activeDriverId === series.driverId &&
                  activeRound === point.round
                    ? 5.5
                    : 3.8
                }
                fill={series.color}
                stroke="var(--background-buttons)"
                strokeWidth="2"
                role="button"
                tabIndex={0}
                aria-label={t("driverStandings.progression.markerAriaLabel", {
                  round: point.round,
                  raceName: point.raceName,
                  driverName: series.driverName,
                  position: point.positionLabel,
                })}
                className="cursor-pointer outline-none transition-all focus-visible:stroke-(--text-color)"
                onMouseEnter={() => {
                  setActiveDriverId(series.driverId);
                  setActiveRound(point.round);
                }}
                onFocus={() => {
                  setActiveDriverId(series.driverId);
                  setActiveRound(point.round);
                }}
              />
            ))
          )}
          {rounds.map((round, index) =>
            index % labelInterval === 0 || index === rounds.length - 1 ? (
              <text
                key={round.round}
                x={getX(round.round)}
                y={height - padding.bottom + 28}
                textAnchor="middle"
                className="fill-(--text-color3) text-[11px] font-(--f1r)"
              >
                {t("driverStandings.progression.roundLabel", {
                  round: round.round,
                })}
              </text>
            ) : null
          )}
        </svg>
      </div>

      {activeRoundData && (
        <div
          className="mt-4 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4"
          aria-live="polite"
        >
          <p className={statLabelClass}>
            {t("driverStandings.progression.selectedRound")}
          </p>
          <p className="mt-2 font-(--f1b) text-(--text-color)">
            {t("driverStandings.progression.roundLabel", {
              round: activeRoundData.round,
            })}{" "}
            · {activeRoundData.raceName}
          </p>
          <p className="mt-1 text-sm text-(--text-color3)">
            {formatRaceDate(
              activeRoundData.date,
              currentLanguage,
              t("driverStandings.progression.dateUnavailable")
            )}
          </p>
          <ol className="mt-4 grid gap-2 text-sm min-[620px]:grid-cols-2 min-[960px]:grid-cols-3">
            {activeStandings.map(({ series, point }) => (
              <li
                key={series.driverId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-(--background-buttons) px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: series.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-(--f1b) text-(--text-color2)">
                    {series.familyName}
                  </span>
                </span>
                <span className="shrink-0 text-(--text-color3)">
                  {t("driverStandings.progression.standingSummary", {
                    position: point.positionLabel,
                    points: point.points.toLocaleString(currentLanguage),
                  })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function DriverStandings(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const { data, isLoading, error } = useDriverStandings(selectedSeason);
  const timelineQuery = useDriverStandingsTimeline(selectedSeason, {
    enabled: !isLoading,
  });
  const sprintQuery = useAllSprintResults(selectedSeason, {
    enabled: !isLoading,
  });
  const qualifyingQuery = useAllQualifyingResults(selectedSeason, {
    enabled: !isLoading,
  });
  const raceResultsQuery = useAllRaceResults(selectedSeason, {
    enabled: !isLoading,
  });
  const drivers = useMemo<DriverStanding[]>(
    () => (data as DriverStanding[] | undefined) ?? [],
    [data]
  );
  const driversWithGaps = useMemo<DriverStandingWithGap[]>(() => {
    if (drivers.length === 0) {
      return [];
    }

    const leaderPoints = parseNumber(drivers[0]?.points);
    const positionChanges = getDriverPositionChanges(
      drivers,
      timelineQuery.data ?? []
    );

    return drivers.map((standing, index) => {
      const standingPoints = parseNumber(standing.points);
      const aheadPoints =
        index > 0 ? parseNumber(drivers[index - 1]?.points) : null;

      return {
        standing,
        gapToLeader: Math.max(0, leaderPoints - standingPoints),
        gapToAhead:
          aheadPoints === null ? null : Math.max(0, aheadPoints - standingPoints),
        positionChange: positionChanges.get(standing.Driver.driverId) ?? null,
      };
    });
  }, [drivers, timelineQuery.data]);
  const seasonWinsLeader = useMemo(
    () => getSeasonWinsLeader(drivers),
    [drivers]
  );
  const seasonPodiumLeader = useMemo(
    () => getSeasonPodiumLeader(raceResultsQuery.data ?? []),
    [raceResultsQuery.data]
  );
  const seasonSprintWinsLeader = useMemo(
    () => getSeasonSprintWinsLeader(sprintQuery.data ?? []),
    [sprintQuery.data]
  );
  const seasonPoleLeader = useMemo(
    () => getSeasonPoleLeader(qualifyingQuery.data ?? []),
    [qualifyingQuery.data]
  );
  const seasonDnfLeader = useMemo(
    () => getSeasonDnfLeader(drivers, raceResultsQuery.data ?? []),
    [drivers, raceResultsQuery.data]
  );

  const handleExportStandings = (): void => {
    const csv = buildDriverStandingsCsv(driversWithGaps, currentLanguage, t);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getDriverStandingsExportFilename(selectedSeason);
    link.click();
    URL.revokeObjectURL(url);
  };

  const listRef = useStaggerFadeIn<HTMLDivElement>({
    selector: "a",
    deps: [drivers.length],
  });

  useEffect(() => {
    document.title = t("driverStandings.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching driver standings:", error);
    }
  }, [error]);

  useEffect(() => {
    if (timelineQuery.error) {
      console.error(
        "Error fetching driver standings progression:",
        timelineQuery.error
      );
    }
  }, [timelineQuery.error]);

  useEffect(() => {
    if (sprintQuery.error) {
      console.error("Error fetching sprint results:", sprintQuery.error);
    }
  }, [sprintQuery.error]);

  useEffect(() => {
    if (qualifyingQuery.error) {
      console.error(
        "Error fetching qualifying results:",
        qualifyingQuery.error
      );
    }
  }, [qualifyingQuery.error]);

  useEffect(() => {
    if (raceResultsQuery.error) {
      console.error("Error fetching race results:", raceResultsQuery.error);
    }
  }, [raceResultsQuery.error]);

  if (isLoading) {
    return (
      <div>
        <Loader label={t("driverStandings.loading")} />
      </div>
    );
  }

  return (
    <div>
      <div className="font-(--f1r)">
        <div className="font-['F1_Bold'] text-xl text-left pl-2.5 pb-2.5 border-b-[5px] border-(--color3)">
          {t("driverStandings.heading", { season: selectedSeason })}
        </div>
        {seasonWinsLeader ||
        seasonPodiumLeader ||
        seasonSprintWinsLeader ||
        seasonPoleLeader ||
        seasonDnfLeader ? (
          <section
            className="mt-5"
            aria-label={t("driverStandings.records.ariaLabel")}
          >
            <div className="grid gap-4 min-[680px]:grid-cols-2 min-[1080px]:grid-cols-3 min-[1440px]:grid-cols-5">
              {seasonWinsLeader ? (
                <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
                  <p className={statLabelClass}>
                    {t("driverStandings.records.mostWins")}
                  </p>
                  <p className="mt-2 font-['F1_Bold'] text-2xl text-(--text-color)">
                    {seasonWinsLeader.holder}
                  </p>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("driverStandings.records.winsValue", {
                      count: seasonWinsLeader.count,
                    })}
                  </p>
                </div>
              ) : null}

              {seasonPodiumLeader ? (
                <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
                  <p className={statLabelClass}>
                    {t("driverStandings.records.mostPodiums")}
                  </p>
                  <p className="mt-2 font-['F1_Bold'] text-2xl text-(--text-color)">
                    {seasonPodiumLeader.holder}
                  </p>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("driverStandings.records.podiumsValue", {
                      count: seasonPodiumLeader.count,
                    })}
                  </p>
                </div>
              ) : null}

              {seasonSprintWinsLeader ? (
                <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
                  <p className={statLabelClass}>
                    {t("driverStandings.records.mostSprintWins")}
                  </p>
                  <p className="mt-2 font-['F1_Bold'] text-2xl text-(--text-color)">
                    {seasonSprintWinsLeader.holder}
                  </p>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("driverStandings.records.sprintWinsValue", {
                      count: seasonSprintWinsLeader.count,
                    })}
                  </p>
                </div>
              ) : null}

              {seasonPoleLeader ? (
                <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
                  <p className={statLabelClass}>
                    {t("driverStandings.records.mostPoles")}
                  </p>
                  <p className="mt-2 font-['F1_Bold'] text-2xl text-(--text-color)">
                    {seasonPoleLeader.holder}
                  </p>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("driverStandings.records.polesValue", {
                      count: seasonPoleLeader.count,
                    })}
                  </p>
                </div>
              ) : null}

              {seasonDnfLeader ? (
                <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
                  <p className={statLabelClass}>
                    {t("driverStandings.records.mostDnfs")}
                  </p>
                  <p className="mt-2 font-['F1_Bold'] text-2xl text-(--text-color)">
                    {seasonDnfLeader.holder}
                  </p>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("driverStandings.records.dnfsValue", {
                      count: seasonDnfLeader.count,
                    })}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        {drivers.length > 0 ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleExportStandings}
              className="inline-flex items-center justify-center rounded-full bg-(--color1) px-4 py-2.5 font-['F1_Bold'] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--color2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2"
              aria-label={t("driverStandings.exportAriaLabel", {
                season: selectedSeason,
              })}
            >
              {t("driverStandings.exportCsv")}
            </button>
          </div>
        ) : null}
        <div className="pt-5" ref={listRef}>
          {drivers.length === 0 ? (
            <EmptyState
              title={t("driverStandings.empty.title")}
              message={t("driverStandings.empty.message", {
                season: selectedSeason,
              })}
            />
          ) : (
            driversWithGaps.map(
              ({ standing: driver, gapToLeader, gapToAhead, positionChange }) => {
                const constructor = driver.Constructors[0];
                const teamName = constructor?.name ?? "";
                const colorClass = colorClasses[teamName] ?? "";
                const logoSrc = getTeamLogo(teamName);
                const flagCode = nationalityCountryCode(
                  driver.Driver.nationality
                );
                const positionChangePresentation = getPositionChangePresentation(
                  positionChange,
                  t
                );

                return (
                  <Link
                    to="/driver/$id"
                    params={{ id: driver.Driver.driverId }}
                    search={seasonSearchParams(selectedSeason)}
                    key={driver.Driver.driverId}
                    className="mb-3 block last:mb-0 md:mb-0"
                  >
                    <div className="relative grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 overflow-hidden rounded-2xl bg-(--background-buttons) p-4 pl-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition-[transform,box-shadow,background-color] duration-300 hover:bg-(--background-buttons-hover) md:flex md:items-center md:gap-0 md:overflow-visible md:rounded-none md:border-b md:border-[#ccc] md:bg-transparent md:p-2.5 md:shadow-none md:ring-0 md:hover:bg-transparent">
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-0 h-full w-1.5 bg-current md:static md:block md:w-2.5 md:self-stretch ${colorClass}`}
                      />
                      <div className="flex shrink-0 flex-col items-center gap-1 md:mx-2.5 md:w-12.5 md:items-start">
                        <p className="flex h-10 w-10 items-center justify-center rounded-full bg-(--background-color) font-['F1_Bold'] text-sm text-(--color3) ring-1 ring-black/10 md:h-auto md:w-12.5 md:rounded-none md:bg-transparent md:text-left md:text-base md:text-(--text-color) md:ring-0">
                          {driver.position}
                        </p>
                        {positionChangePresentation ? (
                          <span
                            className={`inline-flex min-h-5 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-(--f1b) leading-none ${positionChangePresentation.className}`}
                          >
                            <span aria-hidden="true">
                              {positionChangePresentation.text}
                            </span>
                            <span className="sr-only">
                              {positionChangePresentation.label}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5 md:mx-2.5 md:flex-1">
                        <Flag
                          className="h-5 w-8 shrink-0 object-cover md:w-7.5"
                          code={flagCode}
                        />
                        <p className="min-w-0 truncate text-left text-base">
                          <span className="md:hidden">
                            {driver.Driver.givenName}{" "}
                          </span>
                          <span>{driver.Driver.familyName}</span>
                        </p>
                      </div>
                      <div className="col-span-2 col-start-2 flex items-center justify-between border-t border-black/10 pt-3 text-xs text-(--text-color3) md:col-auto md:ml-2.5 md:w-12.5 md:shrink-0 md:justify-center md:border-0 md:p-0 md:text-(--text-color)">
                        <span className="uppercase tracking-[0.14em] md:hidden">
                          {t("driverStandings.teamLabel")}
                        </span>
                        <div className="flex items-center justify-end gap-2 text-right md:justify-center">
                          {logoSrc ? (
                            <img
                              className="h-7 max-w-20 object-contain md:h-full md:w-7.5 md:object-cover"
                              src={logoSrc}
                              alt={teamName}
                            />
                          ) : (
                            <span className="text-(--text-color)">
                              {teamName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 col-start-2 flex items-start justify-between gap-3 border-t border-black/10 pt-3 text-xs text-(--text-color3) md:col-auto md:ml-2.5 md:w-36 md:shrink-0 md:justify-start md:border-0 md:p-0">
                        <span className="uppercase tracking-[0.14em] md:hidden">
                          {t("driverStandings.gapLabel")}
                        </span>
                        <div className="text-right leading-5 md:text-left">
                          <p>
                            {t("driverStandings.gapToLeader", {
                              gap: formatGap(gapToLeader, currentLanguage),
                            })}
                          </p>
                          <p>
                            {t("driverStandings.gapToAhead", {
                              gap: formatGap(gapToAhead, currentLanguage),
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="justify-self-end self-start rounded-full bg-(--color3) px-3 py-1.5 font-['F1_Bold'] text-xs text-white md:ml-auto md:mr-2.5 md:w-20 md:self-auto md:rounded-none md:bg-transparent md:p-0 md:text-right md:text-base md:text-(--text-color)">
                        {t("driverStandings.pointsCompact", {
                          points: parseNumber(driver.points).toLocaleString(
                            currentLanguage
                          ),
                        })}
                      </p>
                    </div>
                  </Link>
                );
              }
            )
          )}
        </div>

        {drivers.length > 0 ? (
          <DriverStandingsProgressionChart
            timeline={timelineQuery.data ?? []}
            currentDrivers={drivers}
            isLoading={timelineQuery.isLoading}
            isError={Boolean(timelineQuery.error)}
          />
        ) : null}
      </div>
    </div>
  );
}

export default DriverStandings;
