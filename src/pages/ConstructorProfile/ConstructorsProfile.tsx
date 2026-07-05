import { useEffect, useMemo, useState } from "react";
import Flag from "react-world-flags";
import { useParams, Link } from "@tanstack/react-router";
import ImageWithFallback from "../../components/ImageWithFallback/ImageWithFallback";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import {
  readFavoriteConstructors,
  saveFavoriteConstructors,
} from "../../app/favoriteConstructors";
import { getDriverImage } from "../../domain/f1/driversImage";
import { getTeamCar } from "../../domain/f1/teamCars";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import useFavicon from "../../hooks/useFavicon";
import {
  useConstructor,
  useConstructorCrossSeasonGallery,
  useConstructorRaceResults,
  useDriverStandingsTimeline,
  useDriversByConstructor,
} from "../../hooks/queries";
import type { ConstructorCrossSeasonSnapshot } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import { nationalityCountryCode } from "../../domain/f1/images";
import type {
  DriverStanding,
  ErgastConstructor,
} from "../../services/api/constructorsApi";
import type { RaceResult } from "../../services/api/racesApi";
import type { DriverStandingsTimelineRound } from "../../services/api/testapi";

const contributionPalette = [
  "var(--color3)",
  "var(--color1)",
  "var(--color2)",
  "#1e88e5",
  "#43a047",
];

const parseNumber = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseWins = (value: string | undefined): number => {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => value.toLocaleString("en-US", options);

const driverName = (driver: DriverStanding): string =>
  `${driver.Driver.givenName} ${driver.Driver.familyName}`;

const formatFlexibleNumber = (value: number): string =>
  Number.isInteger(value)
    ? formatNumber(value)
    : formatNumber(value, { maximumFractionDigits: 1 });

interface AverageRaceFinishSummary {
  average: number;
  finishCount: number;
  consistencyLabel: string;
  scorePercentage: number;
}

const getConsistencyLabel = (averageFinish: number): string => {
  if (averageFinish <= 3) return "Dominant consistency";
  if (averageFinish <= 6) return "Front-running consistency";
  if (averageFinish <= 10) return "Points-scoring consistency";
  if (averageFinish <= 15) return "Midfield consistency";
  return "Recovery-focused season";
};

const buildAverageRaceFinishSummary = (
  results: RaceResult[]
): AverageRaceFinishSummary | null => {
  const finishPositions = results
    .map((result) => parseNumber(result.position))
    .filter((position) => position > 0);

  if (finishPositions.length === 0) return null;

  const average =
    finishPositions.reduce((sum, position) => sum + position, 0) /
    finishPositions.length;

  return {
    average,
    finishCount: finishPositions.length,
    consistencyLabel: getConsistencyLabel(average),
    scorePercentage: Math.max(0, Math.min(100, ((21 - average) / 20) * 100)),
  };
};

interface ConstructorLiveryGalleryEntry {
  season: string;
  teamName: string;
  positionLabel: string;
  points: number;
  wins: number;
  liverySrc?: string;
}

const buildConstructorLiveryGalleryEntries = (
  snapshots: ConstructorCrossSeasonSnapshot[],
  fallbackTeamName: string
): ConstructorLiveryGalleryEntry[] =>
  snapshots.map(({ season, standing }) => {
    const teamName = standing?.Constructor.name ?? fallbackTeamName;
    const liverySrc = getTeamCar(teamName) ?? getTeamCar(fallbackTeamName);

    return {
      season,
      teamName,
      positionLabel: standing?.position ?? "—",
      points: parseNumber(standing?.points),
      wins: parseWins(standing?.wins),
      liverySrc,
    };
  });

const getConstructorFromDrivers = (
  drivers: DriverStanding[],
  constructorId: string
): ErgastConstructor | null => {
  for (const driver of drivers) {
    const constructor = driver.Constructors.find(
      (entry) => entry.constructorId === constructorId
    );

    if (constructor) return constructor;
  }

  return null;
};

const sortByRound = <T extends { round: string }>(items: T[]): T[] =>
  [...items].sort(
    (left, right) => parseNumber(left.round) - parseNumber(right.round)
  );

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

interface DriverTrendPoint {
  round: string;
  raceName: string;
  date?: string;
  points: number;
  positionLabel: string;
}

interface DriverTrendSeries {
  driverId: string;
  driverName: string;
  familyName: string;
  color: string;
  points: DriverTrendPoint[];
}

interface DriverStrengthMetric {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
}

interface DriverStrengthProfile {
  driverId: string;
  driverName: string;
  familyName: string;
  color: string;
  overallScore: number;
  metrics: DriverStrengthMetric[];
}

const clampPercentage = (value: number): number =>
  Math.max(0, Math.min(100, value));

const getPositionStrength = (position: number): number =>
  position > 0
    ? clampPercentage(((21 - Math.min(position, 21)) / 20) * 100)
    : 0;

const buildDriverStrengthProfiles = (
  drivers: DriverStanding[],
  raceResults: RaceResult[],
  totalPoints: number
): DriverStrengthProfile[] => {
  const maxDriverPoints = Math.max(
    0,
    ...drivers.map((driver) => parseNumber(driver.points))
  );
  const maxDriverWins = Math.max(
    0,
    ...drivers.map((driver) => parseWins(driver.wins))
  );

  return drivers.map((driver, index) => {
    const points = parseNumber(driver.points);
    const wins = parseWins(driver.wins);
    const standingStrength = getPositionStrength(parseNumber(driver.position));
    const finishPositions = raceResults
      .filter((result) => result.Driver.driverId === driver.Driver.driverId)
      .map((result) => parseNumber(result.position))
      .filter((position) => position > 0);
    const averageFinish = finishPositions.length
      ? finishPositions.reduce((sum, position) => sum + position, 0) /
        finishPositions.length
      : null;
    const finishStrength = averageFinish
      ? getPositionStrength(averageFinish)
      : standingStrength;
    const metrics = [
      {
        key: "points-pace",
        label: "Points pace",
        shortLabel: "Points",
        value: maxDriverPoints > 0 ? (points / maxDriverPoints) * 100 : 0,
      },
      {
        key: "win-power",
        label: "Win power",
        shortLabel: "Wins",
        value: maxDriverWins > 0 ? (wins / maxDriverWins) * 100 : 0,
      },
      {
        key: "championship-rank",
        label: "Championship rank",
        shortLabel: "Rank",
        value: standingStrength,
      },
      {
        key: "race-finish",
        label: "Race finish",
        shortLabel: "Finish",
        value: finishStrength,
      },
      {
        key: "team-share",
        label: "Team share",
        shortLabel: "Share",
        value: totalPoints > 0 ? (points / totalPoints) * 100 : 0,
      },
    ].map((metric) => ({
      ...metric,
      value: clampPercentage(metric.value),
    }));
    const overallScore = metrics.length
      ? metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length
      : 0;

    return {
      driverId: driver.Driver.driverId,
      driverName: driverName(driver),
      familyName: driver.Driver.familyName,
      color: contributionPalette[index % contributionPalette.length],
      overallScore,
      metrics,
    };
  });
};

const buildDriverTrendSeries = (
  timeline: DriverStandingsTimelineRound[],
  drivers: DriverStanding[]
): DriverTrendSeries[] => {
  const sortedTimeline = sortByRound(timeline);

  return drivers.map((driver, index) => {
    let cumulativePoints = 0;
    let latestPositionLabel = driver.position ?? "—";

    return {
      driverId: driver.Driver.driverId,
      driverName: driverName(driver),
      familyName: driver.Driver.familyName,
      color: contributionPalette[index % contributionPalette.length],
      points: sortedTimeline.map((round) => {
        const standing = round.DriverStandings.find(
          (entry) => entry.Driver.driverId === driver.Driver.driverId
        );

        if (standing) {
          cumulativePoints = parseNumber(standing.points);
          latestPositionLabel = standing.position ?? latestPositionLabel;
        }

        return {
          round: round.round,
          raceName: round.raceName,
          date: round.date,
          points: cumulativePoints,
          positionLabel: standing?.position ?? latestPositionLabel,
        };
      }),
    };
  });
};

function DriverStrengthRadarCharts({
  teamName,
  profiles,
}: {
  teamName: string;
  profiles: DriverStrengthProfile[];
}): JSX.Element {
  const panelClass =
    "rounded-[10px] bg-(--background-buttons) shadow-[0_4px_8px_rgba(0,0,0,0.1)]";
  const statLabelClass =
    "text-xs font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";
  const width = 260;
  const height = 260;
  const center = { x: width / 2, y: height / 2 };
  const radius = 78;
  const getRadarPoint = (
    metricIndex: number,
    value: number,
    metricCount: number
  ): { x: number; y: number } => {
    const angle = -Math.PI / 2 + (metricIndex / metricCount) * Math.PI * 2;
    const scaledRadius = radius * (value / 100);

    return {
      x: center.x + Math.cos(angle) * scaledRadius,
      y: center.y + Math.sin(angle) * scaledRadius,
    };
  };
  const getPolygonPoints = (
    metrics: DriverStrengthMetric[],
    scale = 1
  ): string =>
    metrics
      .map((metric, index) => {
        const point = getRadarPoint(
          index,
          metric.value * scale,
          metrics.length
        );
        return `${point.x},${point.y}`;
      })
      .join(" ");

  return (
    <section
      className={`${panelClass} mb-5 w-full max-w-4xl p-5 text-(--text-color) min-[1400px]:p-6`}
      aria-labelledby="driver-strength-radar-title"
    >
      <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
        <div>
          <p className="text-xs font-(--f1b) uppercase tracking-[0.22em] text-(--text-color3)">
            Performance shape
          </p>
          <h2
            id="driver-strength-radar-title"
            className="mt-2 text-2xl font-(--f1b)"
          >
            Driver strength radar
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-(--text-color3)">
          Radar scores normalize points, wins, championship rank, race finish,
          and team share to reveal where each {teamName} driver is strongest.
        </p>
      </div>

      <div className="mt-5 grid gap-4 min-[820px]:grid-cols-2">
        {profiles.map((profile) => (
          <article
            key={profile.driverId}
            aria-label={`${profile.driverName} driver strength summary`}
            className="rounded-3xl bg-(--background-color) p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={statLabelClass}>{profile.familyName}</p>
                <h3 className="mt-1 text-xl font-(--f1b)">
                  {profile.driverName}
                </h3>
              </div>
              <div className="rounded-2xl bg-(--background-buttons) px-3 py-2 text-right">
                <p className="text-2xl font-(--f1b) text-(--color3)">
                  {formatNumber(profile.overallScore, {
                    maximumFractionDigits: 1,
                  })}
                </p>
                <p className="text-[10px] font-(--f1b) uppercase tracking-[0.16em] text-(--text-color3)">
                  overall
                </p>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${profile.driverName} driver strength radar chart for ${teamName}`}
              className="mx-auto mt-4 h-auto w-full max-w-70"
            >
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon
                  key={scale}
                  points={getPolygonPoints(profile.metrics, scale)}
                  fill="none"
                  stroke="var(--background-color2)"
                  strokeDasharray={scale === 1 ? undefined : "4 6"}
                  aria-hidden="true"
                />
              ))}
              {profile.metrics.map((metric, index) => {
                const axisEnd = getRadarPoint(
                  index,
                  100,
                  profile.metrics.length
                );
                const labelPoint = getRadarPoint(
                  index,
                  124,
                  profile.metrics.length
                );

                return (
                  <g key={metric.key}>
                    <line
                      x1={center.x}
                      y1={center.y}
                      x2={axisEnd.x}
                      y2={axisEnd.y}
                      stroke="var(--background-color2)"
                      aria-hidden="true"
                    />
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y + 4}
                      textAnchor={
                        Math.abs(labelPoint.x - center.x) < 8
                          ? "middle"
                          : labelPoint.x > center.x
                            ? "start"
                            : "end"
                      }
                      className="fill-(--text-color3) text-[11px] font-(--f1r)"
                    >
                      {metric.shortLabel}
                    </text>
                  </g>
                );
              })}
              <polygon
                points={getPolygonPoints(profile.metrics)}
                fill={profile.color}
                fillOpacity="0.22"
                stroke={profile.color}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {profile.metrics.map((metric, index) => {
                const point = getRadarPoint(
                  index,
                  metric.value,
                  profile.metrics.length
                );

                return (
                  <circle
                    key={metric.key}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={profile.color}
                    stroke="var(--background-buttons)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            <dl className="mt-4 grid gap-2 text-sm">
              {profile.metrics.map((metric) => (
                <div
                  key={metric.key}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-(--background-buttons) px-3 py-2"
                >
                  <dt className="font-(--f1b) text-(--text-color2)">
                    {metric.label}
                  </dt>
                  <dd className="text-(--text-color3)">
                    {formatNumber(metric.value, { maximumFractionDigits: 1 })}
                    /100
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConstructorDriverComparisonChart({
  teamName,
  timeline,
  drivers,
  isLoading,
  isError,
}: {
  teamName: string;
  timeline: DriverStandingsTimelineRound[];
  drivers: DriverStanding[];
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<string | null>(null);
  const panelClass =
    "rounded-[10px] bg-(--background-buttons) shadow-[0_4px_8px_rgba(0,0,0,0.1)]";
  const statLabelClass =
    "text-xs font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";
  const progression = useMemo(
    () => buildDriverTrendSeries(timeline, drivers),
    [drivers, timeline]
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
        className={`${panelClass} mb-5 w-full max-w-4xl p-5 text-(--text-color) min-[1400px]:p-6`}
        aria-labelledby="constructor-driver-comparison-title"
      >
        <h2
          id="constructor-driver-comparison-title"
          className="text-2xl font-(--f1b)"
        >
          Driver comparison trends
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Loading round-by-round driver trends…
        </p>
      </section>
    );
  }

  if (isError || progression.length === 0 || rounds.length === 0) {
    return (
      <section
        className={`${panelClass} mb-5 w-full max-w-4xl p-5 text-(--text-color) min-[1400px]:p-6`}
        aria-labelledby="constructor-driver-comparison-title"
      >
        <h2
          id="constructor-driver-comparison-title"
          className="text-2xl font-(--f1b)"
        >
          Driver comparison trends
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Round-by-round driver trends are unavailable for this season right
          now.
        </p>
      </section>
    );
  }

  const width = 760;
  const height = 360;
  const padding = { top: 24, right: 32, bottom: 64, left: 64 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(
    1,
    ...progression.flatMap((series) =>
      series.points.map((point) => point.points)
    )
  );
  const yTicks = Array.from(
    new Set([0, Math.ceil(maxPoints / 2), maxPoints])
  ).sort((left, right) => left - right);
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
  const getY = (points: number): number =>
    padding.top + (1 - points / maxPoints) * innerHeight;
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
        series: DriverTrendSeries;
        point: DriverTrendPoint;
      } => Boolean(entry.point)
    )
    .sort((left, right) => right.point.points - left.point.points);

  return (
    <section
      className={`${panelClass} mb-5 w-full max-w-4xl p-5 text-(--text-color) min-[1400px]:p-6`}
      aria-labelledby="constructor-driver-comparison-title"
    >
      <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
        <div>
          <p className="text-xs font-(--f1b) uppercase tracking-[0.22em] text-(--text-color3)">
            Driver battle
          </p>
          <h2
            id="constructor-driver-comparison-title"
            className="mt-2 text-2xl font-(--f1b)"
          >
            Driver comparison trends
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-(--text-color3)">
          Compare cumulative championship points by round to see how {teamName}
          &apos;s classified drivers traded momentum through the season.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-(--f1b) text-(--text-color2)">
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
          aria-label={`${teamName} driver performance trends by round`}
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
                  {formatNumber(tick)}
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
              .map((point) => `${getX(point.round)},${getY(point.points)}`)
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
                opacity={isDimmed ? 0.28 : 0.95}
              />
            );
          })}
          {progression.flatMap((series) =>
            series.points.map((point) => (
              <circle
                key={`${series.driverId}-${point.round}`}
                cx={getX(point.round)}
                cy={getY(point.points)}
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
                aria-label={`Round ${point.round}, ${point.raceName}, ${series.driverName}: ${formatNumber(point.points)} points, position ${point.positionLabel}`}
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
                R{round.round}
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
          <p className={statLabelClass}>Selected round</p>
          <p className="mt-2 font-(--f1b) text-(--text-color)">
            R{activeRoundData.round} · {activeRoundData.raceName}
          </p>
          <p className="mt-1 text-sm text-(--text-color3)">
            {formatRaceDate(activeRoundData.date)}
          </p>
          <ol className="mt-4 grid gap-2 text-sm min-[620px]:grid-cols-2">
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
                    {series.driverName}
                  </span>
                </span>
                <span className="shrink-0 text-(--text-color3)">
                  P{point.positionLabel} · {formatNumber(point.points)} pts
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function ConstructorSeasonLiveryGallery({
  teamName,
  selectedSeason,
  entries,
  isLoading,
  isError,
}: {
  teamName: string;
  selectedSeason: string;
  entries: ConstructorLiveryGalleryEntry[];
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const sectionClass =
    "mx-auto mb-6 w-[min(1180px,calc(100%-1.5rem))] rounded-[28px] border border-(--background-color2) bg-(--background-buttons) p-5 text-(--text-color) shadow-[0_14px_40px_rgba(0,0,0,0.1)] min-[900px]:p-6";
  const statLabelClass =
    "text-xs font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";

  if (isLoading && entries.length === 0) {
    return (
      <section className={sectionClass} aria-labelledby="constructor-livery-gallery-title">
        <h2 id="constructor-livery-gallery-title" className="font-['F1_Bold'] text-2xl">
          Season livery gallery
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Loading season-by-season liveries…
        </p>
      </section>
    );
  }

  if (isError || entries.length === 0) {
    return (
      <section className={sectionClass} aria-labelledby="constructor-livery-gallery-title">
        <h2 id="constructor-livery-gallery-title" className="font-['F1_Bold'] text-2xl">
          Season livery gallery
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          Season livery data is unavailable for this constructor right now.
        </p>
      </section>
    );
  }

  return (
    <section className={sectionClass} aria-labelledby="constructor-livery-gallery-title">
      <div className="flex flex-col gap-3 min-[820px]:flex-row min-[820px]:items-end min-[820px]:justify-between">
        <div>
          <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--color3)">
            Season-by-season design archive
          </p>
          <h2 id="constructor-livery-gallery-title" className="mt-2 font-['F1_Bold'] text-2xl">
            Season livery gallery
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-(--text-color3)">
          Explore {teamName}&apos;s car presentation across the {entries.length} available seasons in the app, with each card pairing the livery image to that campaign&apos;s championship finish.
        </p>
      </div>

      <div className="mt-5 grid gap-4 min-[760px]:grid-cols-2 min-[1120px]:grid-cols-3">
        {entries.map((entry) => {
          const isSelectedSeasonCard = entry.season === selectedSeason;

          return (
            <article
              key={entry.season}
              className="overflow-hidden rounded-3xl border border-(--background-color2) bg-(--background-color) shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-(--background-color2) px-4 py-3">
                <div>
                  <p className={statLabelClass}>Season</p>
                  <h3 className="mt-1 font-['F1_Bold'] text-2xl text-(--color3)">
                    {entry.season}
                  </h3>
                </div>
                {isSelectedSeasonCard ? (
                  <span className="rounded-full bg-(--color3) px-3 py-1 text-[11px] font-(--f1b) uppercase tracking-[0.18em] text-white">
                    Selected
                  </span>
                ) : null}
              </div>

              <div className="p-4">
                <ImageWithFallback
                  src={entry.liverySrc}
                  alt={`${entry.teamName} ${entry.season} livery`}
                  className="h-44 w-full rounded-2xl bg-(--background-buttons) object-contain p-4"
                  fallbackClassName="border-(--background-color2) bg-(--background-buttons) text-(--text-color3)"
                  fallbackContent={
                    <>
                      <span className="font-['F1_Bold'] text-3xl text-(--color3)">
                        {entry.season}
                      </span>
                      <span className="max-w-full truncate text-center text-xs font-(--f1b) uppercase tracking-[0.18em]">
                        {entry.teamName}
                      </span>
                    </>
                  }
                />

                <div className="mt-4">
                  <p className="text-lg font-(--f1b) text-(--text-color)">
                    {entry.teamName}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl bg-(--background-buttons) p-3">
                      <p className={statLabelClass}>Finish</p>
                      <p className="mt-1 font-(--f1b) text-(--text-color)">
                        P{entry.positionLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-(--background-buttons) p-3">
                      <p className={statLabelClass}>Points</p>
                      <p className="mt-1 font-(--f1b) text-(--text-color)">
                        {formatFlexibleNumber(entry.points)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-(--background-buttons) p-3">
                      <p className={statLabelClass}>Wins</p>
                      <p className="mt-1 font-(--f1b) text-(--text-color)">
                        {formatNumber(entry.wins)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ConstructorsProfile(): JSX.Element {
  const { id } = useParams({ from: "/constructor/$id" });
  const { selectedSeason } = useSelectedSeason();
  const [favoriteConstructorIds, setFavoriteConstructorIds] = useState<string[]>(
    readFavoriteConstructors
  );
  const {
    data: fetchedDrivers,
    isLoading: driversLoading,
    error: driversError,
  } = useDriversByConstructor(id, selectedSeason, { throwOnError: false });
  const {
    data: constructorResponse,
    isLoading: constructorLoading,
    error: constructorError,
  } = useConstructor(id, selectedSeason, { throwOnError: false });
  const constructorRaceResultsQuery = useConstructorRaceResults(
    id,
    selectedSeason,
    {
      enabled: Boolean(id),
      throwOnError: false,
    }
  );
  const constructorLiveryGalleryQuery = useConstructorCrossSeasonGallery(
    id,
    selectedSeason
  );

  const constructorDetails =
    constructorResponse?.MRData?.ConstructorTable?.Constructors?.[0] ?? null;

  const {
    team,
    drivers,
    totalPoints,
    totalWins,
    pointContributions,
    averagePoints,
    leadDriver,
    driverNationalities,
  } = useMemo(() => {
    const filteredDrivers = (fetchedDrivers ?? []).filter(
      (driver) => driver.Driver.driverId !== "bearman"
    );

    const resolvedTeam =
      constructorDetails ?? getConstructorFromDrivers(filteredDrivers, id);

    const pointsSum = filteredDrivers.reduce(
      (sum, driver) => sum + parseNumber(driver.points),
      0
    );
    const winsSum = filteredDrivers.reduce(
      (sum, driver) => sum + parseWins(driver.wins),
      0
    );
    const topDriver =
      filteredDrivers.reduce<DriverStanding | null>((leader, driver) => {
        if (!leader) return driver;

        return parseNumber(driver.points) > parseNumber(leader.points)
          ? driver
          : leader;
      }, null) ?? null;
    const nationalities = Array.from(
      new Set(
        filteredDrivers
          .map((driver) => driver.Driver.nationality)
          .filter((nationality): nationality is string => Boolean(nationality))
      )
    );
    const contributions = filteredDrivers.map((driver, index) => {
      const points = parseNumber(driver.points);

      return {
        driverId: driver.Driver.driverId,
        driverName: driverName(driver),
        points,
        percentage: pointsSum > 0 ? (points / pointsSum) * 100 : 0,
        color: contributionPalette[index % contributionPalette.length],
      };
    });

    return {
      team: resolvedTeam,
      drivers: filteredDrivers,
      totalPoints: pointsSum,
      totalWins: winsSum,
      pointContributions: contributions,
      averagePoints: filteredDrivers.length
        ? pointsSum / filteredDrivers.length
        : 0,
      leadDriver: topDriver,
      driverNationalities: nationalities,
    };
  }, [constructorDetails, fetchedDrivers, id]);
  const driverTimelineQuery = useDriverStandingsTimeline(selectedSeason, {
    enabled: drivers.length > 0,
    throwOnError: false,
  });
  const averageRaceFinishSummary = useMemo(
    () => buildAverageRaceFinishSummary(constructorRaceResultsQuery.data ?? []),
    [constructorRaceResultsQuery.data]
  );
  const driverStrengthProfiles = useMemo(
    () =>
      buildDriverStrengthProfiles(
        drivers,
        constructorRaceResultsQuery.data ?? [],
        totalPoints
      ),
    [constructorRaceResultsQuery.data, drivers, totalPoints]
  );

  useEffect(() => {
    if (team) {
      document.title = `${team.name} Constructor Profile`;
    }
  }, [team]);

  const teamLogoSrc = team ? getTeamLogo(team.name) : undefined;

  useFavicon(teamLogoSrc);

  const isLoading = driversLoading || constructorLoading;
  const error = driversError ?? constructorError;

  if (isLoading) {
    return <Loader label="Loading constructor profile" />;
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load constructor profile"
        message={error.message}
        icon="⚠️"
      />
    );
  }

  if (!team) {
    return (
      <EmptyState
        title="No team data available"
        message="We could not find constructor details or classified drivers for this season."
      />
    );
  }

  const constructorFlagCode = nationalityCountryCode(team.nationality);
  const leadDriverName = leadDriver ? driverName(leadDriver) : "No drivers";
  const constructorUrl = team.url;
  const panelBaseClass =
    "rounded-[10px] bg-(--background-buttons) shadow-[0_4px_8px_rgba(0,0,0,0.1)]";
  const cardBaseClass = `${panelBaseClass} text-center transition-[transform,box-shadow] duration-300 hover:-translate-y-[5px] hover:shadow-[0_6px_12px_rgba(0,0,0,0.15)]`;
  const factCardClass =
    "rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.08)]";
  const factLabelClass =
    "text-xs font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";
  const isFavoriteConstructor = favoriteConstructorIds.includes(
    team.constructorId
  );
  const favoriteButtonLabel = isFavoriteConstructor
    ? `Remove ${team.name} from favorite constructors`
    : `Mark ${team.name} as favorite`;
  const liveryGalleryEntries = useMemo(
    () =>
      buildConstructorLiveryGalleryEntries(
        constructorLiveryGalleryQuery.data,
        team.name
      ),
    [constructorLiveryGalleryQuery.data, team.name]
  );
  const handleFavoriteToggle = (): void => {
    setFavoriteConstructorIds((currentFavoriteConstructorIds) => {
      const nextFavoriteConstructorIds = currentFavoriteConstructorIds.includes(
        team.constructorId
      )
        ? currentFavoriteConstructorIds.filter(
            (favoriteConstructorId) =>
              favoriteConstructorId !== team.constructorId
          )
        : [...currentFavoriteConstructorIds, team.constructorId];

      return saveFavoriteConstructors(nextFavoriteConstructorIds);
    });
  };

  return (
    <>
      <section className="mx-auto my-6 w-[min(1180px,calc(100%-1.5rem))] overflow-hidden rounded-[28px] border border-(--background-color2) bg-[linear-gradient(135deg,var(--background-buttons),var(--background-color2))] p-5 text-(--text-color) shadow-[0_24px_70px_rgba(0,0,0,0.14)] min-[900px]:p-8">
        <div className="flex flex-col gap-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <div className="flex flex-col gap-5 min-[640px]:flex-row min-[640px]:items-center">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl border border-(--background-color2) bg-(--background-color) p-5">
              {teamLogoSrc ? (
                <img
                  src={teamLogoSrc}
                  alt={`${team.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="font-(--f1b) text-3xl text-(--color3)">
                  {team.name.slice(0, 3).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-(--f1b) uppercase tracking-[0.26em] text-(--color3)">
                Constructor profile · {selectedSeason}
              </p>
              <h1 className="mt-3 cursor-default text-[34px] font-['F1_Bold'] leading-tight min-[900px]:text-6xl">
                {team.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-(--text-color2)">
                {constructorFlagCode && (
                  <Flag
                    code={constructorFlagCode}
                    className="h-5 w-7 rounded-sm object-cover"
                  />
                )}
                <span>{team.nationality}</span>
                <span aria-hidden="true" className="text-(--color3)">
                  •
                </span>
                <span>{team.constructorId}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  aria-pressed={isFavoriteConstructor}
                  aria-label={favoriteButtonLabel}
                  className={`rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color3) ${
                    isFavoriteConstructor
                      ? "border-(--color3) bg-(--color3) text-white"
                      : "border-(--background-color2) bg-(--background-color) text-(--text-color2) hover:border-(--color3) hover:text-(--color3)"
                  }`}
                  onClick={handleFavoriteToggle}
                >
                  <span
                    aria-hidden="true"
                    className="mr-2 text-base leading-none"
                  >
                    {isFavoriteConstructor ? "★" : "☆"}
                  </span>
                  {isFavoriteConstructor ? "Favorited" : "Favorite"}
                </button>
                {constructorUrl && (
                  <a
                    href={constructorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-(--color3) px-5 py-2 text-sm font-bold text-white transition hover:opacity-85"
                  >
                    View constructor history
                  </a>
                )}
                <Link
                  to="/constructorstandings"
                  search={seasonSearchParams(selectedSeason)}
                  className="rounded-full border border-(--background-color2) px-5 py-2 text-sm font-bold transition hover:border-(--color3) hover:text-(--color3)"
                >
                  Back to standings
                </Link>
              </div>
            </div>
          </div>
          <div className="grid gap-3 min-[520px]:grid-cols-2 min-[900px]:min-w-85">
            <article className={factCardClass}>
              <p className={factLabelClass}>Total points</p>
              <p className="mt-2 text-3xl font-(--f1b) text-(--color3)">
                {formatFlexibleNumber(totalPoints)}
              </p>
            </article>
            <article className={factCardClass}>
              <p className={factLabelClass}>Total wins</p>
              <p className="mt-2 text-3xl font-(--f1b) text-(--color3)">
                {formatNumber(totalWins)}
              </p>
            </article>
            <article className={factCardClass}>
              <p className={factLabelClass}>Lead driver</p>
              <p className="mt-2 text-lg font-bold">{leadDriverName}</p>
            </article>
            <article className={factCardClass}>
              <p className={factLabelClass}>Avg / driver</p>
              <p className="mt-2 text-lg font-bold">
                {formatFlexibleNumber(averagePoints)} pts
              </p>
            </article>
          </div>
        </div>
      </section>
      <ConstructorSeasonLiveryGallery
        teamName={team.name}
        selectedSeason={selectedSeason}
        entries={liveryGalleryEntries}
        isLoading={constructorLiveryGalleryQuery.isLoading}
        isError={constructorLiveryGalleryQuery.isError}
      />
      <div className="flex flex-col items-center min-[1400px]:pt-5 min-[1400px]:pb-[50%]">
        <div className="mx-auto my-5 flex flex-nowrap justify-center gap-5 px-2.5 min-[1400px]:gap-15">
          {drivers.map((driver) => {
            const driverImage = getDriverImage(
              driver.Driver.driverId,
              "profile"
            );
            const driverFlagCode = nationalityCountryCode(
              driver.Driver.nationality
            );

            return (
              <div
                className={`${cardBaseClass} w-62.5 overflow-hidden min-[1400px]:w-100`}
                key={driver.Driver.driverId}
              >
                <Link
                  to="/driver/$id"
                  params={{ id: driver.Driver.driverId }}
                  search={seasonSearchParams(selectedSeason)}
                >
                  {driverImage && (
                    <img
                      className="h-auto w-full mask-[linear-gradient(white_90%,transparent)]"
                      src={driverImage}
                      alt={driver.Driver.driverId}
                    />
                  )}
                  <div className="p-5">
                    <p className="mb-2.5 text-xl font-bold min-[1400px]:text-3xl">
                      {driver.Driver.givenName} {driver.Driver.familyName}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-(--text-color3)">
                      {driverFlagCode && (
                        <Flag
                          code={driverFlagCode}
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                      )}
                      <span>
                        {driver.Driver.nationality ?? "Nationality N/A"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-(--background-color) p-3">
                        <p className={factLabelClass}>Points</p>
                        <p className="mt-1 text-lg font-bold text-(--color3)">
                          {formatFlexibleNumber(parseNumber(driver.points))}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-(--background-color) p-3">
                        <p className={factLabelClass}>Wins</p>
                        <p className="mt-1 text-lg font-bold text-(--color3)">
                          {formatNumber(parseWins(driver.wins))}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex cursor-default flex-row items-center justify-center gap-5 px-2.5 pb-15 text-center min-[1400px]:gap-41.25 min-[1400px]:p-0">
          <div
            className={`${panelBaseClass} w-50 p-2.5 text-center min-[1400px]:w-75`}
          >
            <h1 className="mb-2.5 text-xl font-bold min-[1400px]:text-4xl">
              Total Wins
            </h1>
            <p className="text-[28px] font-bold text-(--color3) min-[1400px]:text-[50px]">
              {totalWins}
            </p>
          </div>
          <div
            className={`${panelBaseClass} w-50 p-2.5 text-center min-[1400px]:w-75`}
          >
            <h1 className="mb-2.5 text-xl font-bold min-[1400px]:text-4xl">
              Total Points
            </h1>
            <p className="text-[28px] font-bold text-(--color3) min-[1400px]:text-[50px]">
              {formatNumber(totalPoints, { maximumFractionDigits: 1 })}
            </p>
          </div>
        </div>
        <section
          className={`${panelBaseClass} mb-5 grid w-full max-w-4xl gap-4 p-5 text-(--text-color) min-[760px]:grid-cols-3`}
          aria-label="Constructor facts"
        >
          <article>
            <p className={factLabelClass}>Constructor nationality</p>
            <p className="mt-2 flex items-center justify-center gap-2 text-lg font-bold min-[760px]:justify-start">
              {constructorFlagCode && (
                <Flag
                  code={constructorFlagCode}
                  className="h-5 w-7 rounded-sm object-cover"
                />
              )}
              {team.nationality}
            </p>
          </article>
          <article>
            <p className={factLabelClass}>Classified drivers</p>
            <p className="mt-2 text-lg font-bold">{drivers.length}</p>
          </article>
          <article>
            <p className={factLabelClass}>Driver nationalities</p>
            <p className="mt-2 text-lg font-bold">
              {driverNationalities.join(", ") || "N/A"}
            </p>
          </article>
        </section>
        <section
          className={`${panelBaseClass} mb-5 w-full max-w-4xl p-5 text-(--text-color) min-[760px]:p-6`}
          aria-labelledby="average-race-finish-title"
        >
          <div className="flex flex-col gap-4 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
            <div>
              <p className={factLabelClass}>Consistency indicator</p>
              <h2
                id="average-race-finish-title"
                className="mt-2 text-2xl font-(--f1b)"
              >
                Average race finish
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-color3)">
                Lower finishing averages point to steadier race execution across
                both cars.
              </p>
            </div>
            <div className="rounded-3xl bg-(--background-color) px-5 py-4 text-left min-[760px]:min-w-60">
              {constructorRaceResultsQuery.isLoading ? (
                <p className="text-sm text-(--text-color3)">
                  Calculating finishes…
                </p>
              ) : averageRaceFinishSummary ? (
                <>
                  <p className="text-4xl font-(--f1b) text-(--color3)">
                    P{formatFlexibleNumber(averageRaceFinishSummary.average)}
                  </p>
                  <p className="mt-2 text-sm font-bold text-(--text-color2)">
                    {averageRaceFinishSummary.consistencyLabel}
                  </p>
                  <p className="mt-1 text-xs text-(--text-color3)">
                    {formatNumber(averageRaceFinishSummary.finishCount)}{" "}
                    classified finishes counted
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-(--background-buttons)">
                    <div
                      className="h-full rounded-full bg-(--color3)"
                      style={{
                        width: `${averageRaceFinishSummary.scorePercentage}%`,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-(--text-color3)">
                  Average finish unavailable for this constructor.
                </p>
              )}
            </div>
          </div>
        </section>
        {drivers.length === 0 ? (
          <EmptyState
            title="No classified drivers"
            message="Constructor details are available, but no driver standings were returned for this team."
            className="max-w-4xl"
          />
        ) : (
          <>
            <DriverStrengthRadarCharts
              teamName={team.name}
              profiles={driverStrengthProfiles}
            />
            <ConstructorDriverComparisonChart
              teamName={team.name}
              timeline={driverTimelineQuery.data ?? []}
              drivers={drivers}
              isLoading={driverTimelineQuery.isLoading}
              isError={Boolean(driverTimelineQuery.error)}
            />
            <section
              className={`${panelBaseClass} w-full max-w-4xl p-5 text-(--text-color) min-[1400px]:p-6`}
              aria-labelledby="constructor-points-contribution-title"
            >
              <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
                <div>
                  <p className="text-xs font-(--f1b) uppercase tracking-[0.22em] text-(--text-color3)">
                    Team breakdown
                  </p>
                  <h2
                    id="constructor-points-contribution-title"
                    className="mt-2 text-2xl font-(--f1b)"
                  >
                    Points contribution
                  </h2>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-(--text-color3)">
                  See how each classified driver contributes to {team.name}
                  &apos;s total of{" "}
                  {formatNumber(totalPoints, { maximumFractionDigits: 1 })}
                  points.
                </p>
              </div>

              <div className="mt-5 rounded-3xl bg-(--background-color) p-4 min-[1400px]:p-5">
                <div
                  role="img"
                  aria-label={`${team.name} driver points contribution chart`}
                >
                  <div className="flex h-4 overflow-hidden rounded-full bg-(--background-buttons)">
                    {pointContributions.map((driver) => (
                      <div
                        key={driver.driverId}
                        className="h-full"
                        style={{
                          width: `${driver.percentage}%`,
                          backgroundColor: driver.color,
                        }}
                        aria-hidden="true"
                        title={`${driver.driverName}: ${formatNumber(
                          driver.points,
                          {
                            maximumFractionDigits: 1,
                          }
                        )} pts (${formatNumber(driver.percentage, {
                          maximumFractionDigits: 1,
                        })}%)`}
                      />
                    ))}
                  </div>
                </div>

                <ol className="mt-4 grid gap-3">
                  {pointContributions.map((driver) => (
                    <li
                      key={driver.driverId}
                      className="rounded-[18px] bg-(--background-buttons) p-4"
                    >
                      <div className="flex flex-col gap-2 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: driver.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate font-(--f1b) text-(--text-color)">
                            {driver.driverName}
                          </span>
                        </span>
                        <span className="text-sm text-(--text-color3)">
                          {`${formatNumber(driver.points, {
                            maximumFractionDigits: 1,
                          })} pts · ${formatNumber(driver.percentage, {
                            maximumFractionDigits: 1,
                          })}%`}
                        </span>
                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-(--background-color)">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${driver.percentage}%`,
                            backgroundColor: driver.color,
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default ConstructorsProfile;
