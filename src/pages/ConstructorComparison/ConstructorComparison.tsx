import { useCallback, useEffect, useMemo, useState } from "react";
import Flag from "react-world-flags";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import EmptyState from "../../components/EmptyState/EmptyState";
import {
  useConstructorStandings,
  useConstructorStandingsTimeline,
  useConstructorRaceResults,
  useDriversByConstructor,
} from "../../hooks/queries";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import { seasonSearchParams } from "../../domain/f1/seasons";
import {
  constructorComparisonSearchParams,
  type ConstructorComparisonSearch,
} from "../../domain/f1/constructorComparisonSearch";
import { nationalityCountryCode } from "../../domain/f1/images";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import teamColorClass from "../../domain/f1/teamColorClass";
import type {
  ConstructorStanding,
  ConstructorStandingsTimelineRound,
  DriverStanding,
} from "../../services/api/constructorsApi";
import type { RaceResult } from "../../services/api/racesApi";
import ConstructorComparisonPageSkeleton from "./ConstructorComparisonPageSkeleton";

const colorClasses = teamColorClass as Record<string, string | undefined>;

const cardBase =
  "rounded-[1.75rem] border border-(--background-color2) bg-(--background-buttons) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const statLabelClass =
  "text-[0.68rem] font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";
const statValueClass = "mt-2 font-(--f1b) text-xl text-(--text-color)";

type ConstructorComparisonSearchUpdater = (previous: {
  season?: string;
  constructor1?: string;
  constructor2?: string;
}) => {
  season?: string;
  constructor1?: string;
  constructor2?: string;
};

interface ConstructorOption {
  id: string;
  label: string;
}

type UnitKey = "place" | "point" | "win" | "podium" | "driver" | "radarPoint";

interface Metric {
  label: string;
  leftValue: number;
  rightValue: number;
  leftDisplay: string;
  rightDisplay: string;
  unitKey: UnitKey;
  lowerIsBetter?: boolean;
}

interface TeamStats {
  drivers: DriverStanding[];
  driverCount: number;
  averagePoints: number;
  leadDriver: DriverStanding | null;
}

interface ConstructorProgressionPoint {
  round: string;
  raceName: string;
  date?: string;
  position: number;
  positionLabel: string;
  points: number;
}

interface ConstructorProgressionSeries {
  constructorId: string;
  constructorName: string;
  currentPosition: number;
  color: string;
  points: ConstructorProgressionPoint[];
}

interface ConstructorStrengthRadarMetric {
  label: string;
  description: string;
  leftDisplay: string;
  rightDisplay: string;
  leftScore: number;
  rightScore: number;
}

type ShareStatus = "idle" | "shared" | "copied" | "error";

const parseNumber = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortByRound = <T extends { round: string }>(items: T[]): T[] =>
  [...items].sort(
    (left, right) => parseNumber(left.round) - parseNumber(right.round)
  );

const formatNumber = (
  value: number,
  language: string,
  options?: Intl.NumberFormatOptions
): string => value.toLocaleString(language, options);

const formatUnit = (
  value: number,
  unitKey: UnitKey,
  language: string,
  t: TFunction
): string => {
  const displayValue = Number.isInteger(value)
    ? formatNumber(value, language)
    : formatNumber(value, language, { maximumFractionDigits: 1 });

  return t(`constructorComparison.units.${unitKey}`, {
    count: value,
    formattedCount: displayValue,
  });
};

const formatPoints = (
  value: number,
  language: string,
  t: TFunction
): string => {
  return t("constructorComparison.pointsDisplay", {
    points: formatNumber(value, language),
  });
};

const formatPositionLabel = (
  position: string | number | undefined,
  t: TFunction
): string =>
  t("constructorComparison.positionLabel", {
    position: position ? String(position) : "—",
  });

const formatRoundLabel = (round: string, t: TFunction): string =>
  t("constructorComparison.roundLabel", { round });

const formatRaceDate = (
  date: string | undefined,
  language: string,
  fallbackLabel: string
): string => {
  if (!date) {
    return fallbackLabel;
  }

  const raceDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(raceDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(raceDate);
};

const clampRadarScore = (value: number): number =>
  Math.round(Math.min(Math.max(value, 0), 100));

const normalizeHigherScore = (
  left: number,
  right: number
): [number, number] => {
  const maxValue = Math.max(left, right);

  if (maxValue <= 0) {
    return [0, 0];
  }

  return [
    clampRadarScore((left / maxValue) * 100),
    clampRadarScore((right / maxValue) * 100),
  ];
};

const normalizeLowerScore = (left: number, right: number): [number, number] => {
  const validScores = [left, right].filter((value) => value > 0);

  if (validScores.length === 0) {
    return [0, 0];
  }

  const bestValue = Math.min(...validScores);

  return [
    left > 0 ? clampRadarScore((bestValue / left) * 100) : 0,
    right > 0 ? clampRadarScore((bestValue / right) * 100) : 0,
  ];
};

const average = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
};

const constructorOption = (team: ConstructorStanding): ConstructorOption => ({
  id: team.Constructor.constructorId,
  label: team.Constructor.name,
});

const driverName = (driver: DriverStanding): string =>
  `${driver.Driver.givenName} ${driver.Driver.familyName}`;

const getTeamInitials = (teamName: string): string =>
  teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

const getTeamStats = (drivers: DriverStanding[] | undefined): TeamStats => {
  const uniqueDrivers = Array.from(
    new Map(
      (drivers ?? []).map((driver) => [driver.Driver.driverId, driver])
    ).values()
  ).sort(
    (left, right) => parseNumber(left.position) - parseNumber(right.position)
  );

  const driverCount = uniqueDrivers.length;
  const totalPoints = uniqueDrivers.reduce(
    (sum, driver) => sum + parseNumber(driver.points),
    0
  );

  return {
    drivers: uniqueDrivers,
    driverCount,
    averagePoints: driverCount > 0 ? totalPoints / driverCount : 0,
    leadDriver: uniqueDrivers[0] ?? null,
  };
};

const getConstructorPodiumFinishes = (
  results: readonly RaceResult[] | undefined
): number =>
  (results ?? []).filter((result) => {
    const position = parseNumber(result.position);
    return position >= 1 && position <= 3;
  }).length;

const buildConstructorPointsProgression = (
  timeline: ConstructorStandingsTimelineRound[],
  leftTeam: ConstructorStanding,
  rightTeam: ConstructorStanding
): ConstructorProgressionSeries[] => {
  const sortedTimeline = sortByRound(timeline);
  const selectedTeams = [
    { team: leftTeam, color: "var(--color3)" },
    { team: rightTeam, color: "var(--color1)" },
  ];

  return selectedTeams
    .map(({ team, color }) => {
      const constructorId = team.Constructor.constructorId;
      const points = sortedTimeline.flatMap((round) => {
        const standing = round.ConstructorStandings.find(
          (entry) => entry.Constructor.constructorId === constructorId
        );

        if (!standing) {
          return [];
        }

        const position = parseNumber(standing.position);
        return [
          {
            round: round.round,
            raceName: round.raceName,
            date: round.date,
            position,
            positionLabel: standing.position ?? "—",
            points: parseNumber(standing.points),
          },
        ];
      });

      return {
        constructorId,
        constructorName: team.Constructor.name,
        currentPosition: parseNumber(team.position),
        color,
        points,
      };
    })
    .filter((series) => series.points.length > 0)
    .sort((left, right) => left.currentPosition - right.currentPosition);
};

const getRecentPointsGain = (points: ConstructorProgressionPoint[]): number => {
  if (points.length === 0) {
    return 0;
  }

  const finalPoint = points[points.length - 1];
  const windowSize = Math.min(5, points.length);
  const baselineIndex =
    points.length > windowSize ? points.length - windowSize - 1 : -1;
  const baselinePoint = baselineIndex >= 0 ? points[baselineIndex] : undefined;

  return Math.max(finalPoint.points - (baselinePoint?.points ?? 0), 0);
};

const getAverageConstructorPosition = (
  points: ConstructorProgressionPoint[]
): number | null =>
  average(
    points.map((point) => point.position).filter((position) => position > 0)
  );

const buildConstructorStrengthRadarMetrics = ({
  leftTeam,
  rightTeam,
  leftStats,
  rightStats,
  timeline,
  language,
  t,
}: {
  leftTeam: ConstructorStanding;
  rightTeam: ConstructorStanding;
  leftStats: TeamStats;
  rightStats: TeamStats;
  timeline: ConstructorStandingsTimelineRound[];
  language: string;
  t: TFunction;
}): ConstructorStrengthRadarMetric[] => {
  const leftPosition = parseNumber(leftTeam.position);
  const rightPosition = parseNumber(rightTeam.position);
  const leftPoints = parseNumber(leftTeam.points);
  const rightPoints = parseNumber(rightTeam.points);
  const leftWins = parseNumber(leftTeam.wins);
  const rightWins = parseNumber(rightTeam.wins);
  const progression = buildConstructorPointsProgression(
    timeline,
    leftTeam,
    rightTeam
  );
  const leftProgression =
    progression.find(
      (series) => series.constructorId === leftTeam.Constructor.constructorId
    )?.points ?? [];
  const rightProgression =
    progression.find(
      (series) => series.constructorId === rightTeam.Constructor.constructorId
    )?.points ?? [];
  const hasTimelineData =
    leftProgression.length > 0 || rightProgression.length > 0;

  const [leftRankScore, rightRankScore] = normalizeLowerScore(
    leftPosition,
    rightPosition
  );
  const [leftPointsScore, rightPointsScore] = normalizeHigherScore(
    leftPoints,
    rightPoints
  );
  const [leftWinsScore, rightWinsScore] = normalizeHigherScore(
    leftWins,
    rightWins
  );
  const [leftAverageOutputScore, rightAverageOutputScore] =
    normalizeHigherScore(leftStats.averagePoints, rightStats.averagePoints);
  const leftRecentPoints = hasTimelineData
    ? getRecentPointsGain(leftProgression)
    : leftPoints;
  const rightRecentPoints = hasTimelineData
    ? getRecentPointsGain(rightProgression)
    : rightPoints;
  const [leftRecentScore, rightRecentScore] = normalizeHigherScore(
    leftRecentPoints,
    rightRecentPoints
  );
  const leftAveragePosition =
    getAverageConstructorPosition(leftProgression) ?? leftPosition;
  const rightAveragePosition =
    getAverageConstructorPosition(rightProgression) ?? rightPosition;
  const [leftConsistencyScore, rightConsistencyScore] = normalizeLowerScore(
    leftAveragePosition,
    rightAveragePosition
  );
  const formatAveragePosition = (value: number): string =>
    t("constructorComparison.radar.averagePositionDisplay", {
      position: value
        ? formatNumber(value, language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })
        : "—",
    });

  return [
    {
      label: t("constructorComparison.radar.metrics.championshipRank.label"),
      description: t(
        "constructorComparison.radar.metrics.championshipRank.description"
      ),
      leftDisplay: formatPositionLabel(leftPosition, t),
      rightDisplay: formatPositionLabel(rightPosition, t),
      leftScore: leftRankScore,
      rightScore: rightRankScore,
    },
    {
      label: t("constructorComparison.radar.metrics.pointsHaul.label"),
      description: t(
        "constructorComparison.radar.metrics.pointsHaul.description"
      ),
      leftDisplay: formatPoints(leftPoints, language, t),
      rightDisplay: formatPoints(rightPoints, language, t),
      leftScore: leftPointsScore,
      rightScore: rightPointsScore,
    },
    {
      label: t("constructorComparison.radar.metrics.winConversion.label"),
      description: t(
        "constructorComparison.radar.metrics.winConversion.description"
      ),
      leftDisplay: formatUnit(leftWins, "win", language, t),
      rightDisplay: formatUnit(rightWins, "win", language, t),
      leftScore: leftWinsScore,
      rightScore: rightWinsScore,
    },
    {
      label: t("constructorComparison.radar.metrics.averageOutput.label"),
      description: t(
        "constructorComparison.radar.metrics.averageOutput.description"
      ),
      leftDisplay: t("constructorComparison.radar.pointsPerDriverDisplay", {
        points: formatNumber(leftStats.averagePoints, language, {
          maximumFractionDigits: 1,
        }),
      }),
      rightDisplay: t("constructorComparison.radar.pointsPerDriverDisplay", {
        points: formatNumber(rightStats.averagePoints, language, {
          maximumFractionDigits: 1,
        }),
      }),
      leftScore: leftAverageOutputScore,
      rightScore: rightAverageOutputScore,
    },
    {
      label: t("constructorComparison.radar.metrics.recentForm.label"),
      description: hasTimelineData
        ? t("constructorComparison.radar.metrics.recentForm.description")
        : t(
            "constructorComparison.radar.metrics.recentForm.loadingDescription"
          ),
      leftDisplay: t("constructorComparison.radar.recentPointsDisplay", {
        points: formatNumber(leftRecentPoints, language, {
          maximumFractionDigits: 1,
        }),
      }),
      rightDisplay: t("constructorComparison.radar.recentPointsDisplay", {
        points: formatNumber(rightRecentPoints, language, {
          maximumFractionDigits: 1,
        }),
      }),
      leftScore: leftRecentScore,
      rightScore: rightRecentScore,
    },
    {
      label: t("constructorComparison.radar.metrics.consistency.label"),
      description: hasTimelineData
        ? t("constructorComparison.radar.metrics.consistency.description")
        : t(
            "constructorComparison.radar.metrics.consistency.loadingDescription"
          ),
      leftDisplay: formatAveragePosition(leftAveragePosition),
      rightDisplay: formatAveragePosition(rightAveragePosition),
      leftScore: leftConsistencyScore,
      rightScore: rightConsistencyScore,
    },
  ];
};

const buildComparisonShareUrl = (
  selectedSeason: string,
  leftConstructorId: string,
  rightConstructorId: string
): string => {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const url = new URL("constructor-comparison", baseUrl);
  url.searchParams.set("season", selectedSeason);
  url.searchParams.set("constructor1", leftConstructorId);
  url.searchParams.set("constructor2", rightConstructorId);

  return url.toString();
};

const copyTextToClipboard = async (text: string): Promise<void> => {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is not available");
  }

  await navigator.clipboard.writeText(text);
};

const getShareStatusMessage = (status: ShareStatus, t: TFunction): string => {
  switch (status) {
    case "shared":
      return t("constructorComparison.share.status.shared");
    case "copied":
      return t("constructorComparison.share.status.copied");
    case "error":
      return t("constructorComparison.share.status.error");
    case "idle":
    default:
      return t("constructorComparison.share.status.idle");
  }
};

function ShareComparisonButton({
  selectedSeason,
  leftTeam,
  rightTeam,
}: {
  selectedSeason: string;
  leftTeam: ConstructorStanding;
  rightTeam: ConstructorStanding;
}): JSX.Element {
  const { t } = useTranslation();
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const leftName = leftTeam.Constructor.name;
  const rightName = rightTeam.Constructor.name;
  const shareUrl = useMemo(
    () =>
      buildComparisonShareUrl(
        selectedSeason,
        leftTeam.Constructor.constructorId,
        rightTeam.Constructor.constructorId
      ),
    [
      leftTeam.Constructor.constructorId,
      rightTeam.Constructor.constructorId,
      selectedSeason,
    ]
  );
  const statusMessage = getShareStatusMessage(shareStatus, t);

  const handleShare = useCallback(async (): Promise<void> => {
    const shareData: ShareData = {
      title: t("constructorComparison.share.title", { leftName, rightName }),
      text: t("constructorComparison.share.text", {
        leftName,
        rightName,
        season: selectedSeason,
      }),
      url: shareUrl,
    };

    try {
      if (
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare(shareData))
      ) {
        await navigator.share(shareData);
        setShareStatus("shared");
        return;
      }

      await copyTextToClipboard(shareUrl);
      setShareStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Error sharing constructor comparison:", error);
      setShareStatus("error");
    }
  }, [leftName, rightName, selectedSeason, shareUrl, t]);

  return (
    <div className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex w-full items-center justify-center rounded-full bg-(--color3) px-4 py-3 text-sm font-(--f1b) text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-(--color1) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
      >
        {shareStatus === "copied"
          ? t("constructorComparison.share.copiedButton")
          : t("constructorComparison.share.button")}
      </button>
      <p
        className="mt-3 text-xs leading-5 text-(--text-color3)"
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </div>
  );
}

function ConstructorSelect({
  id,
  label,
  value,
  options,
  disabledConstructorId,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: ConstructorOption[];
  disabledConstructorId: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label
      className="flex flex-col gap-2 text-sm font-(--f1b) text-(--text-color2)"
      htmlFor={id}
    >
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-(--background-color2) bg-(--background-color) px-4 py-3 font-(--f1r) text-(--text-color) shadow-sm outline-none transition-colors focus:border-(--color3) focus:ring-2 focus:ring-(--color3)/30"
      >
        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
            disabled={option.id === disabledConstructorId}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ConstructorSummaryCard({
  team,
  drivers,
  selectedSeason,
}: {
  team: ConstructorStanding;
  drivers: DriverStanding[];
  selectedSeason: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const teamName = team.Constructor.name;
  const flagCode = nationalityCountryCode(team.Constructor.nationality);
  const teamImg = getTeamLogo(teamName);
  const colorClass = colorClasses[teamName] ?? "text-(--color3)";
  const { driverCount, averagePoints, leadDriver } = getTeamStats(drivers);

  return (
    <article
      className={`${cardBase} relative overflow-hidden p-5 min-[900px]:p-6`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-(--color1) via-(--color2) to-(--color3)"
      />
      <div className="grid gap-5 min-[560px]:grid-cols-[1fr_auto] min-[560px]:items-end">
        <div>
          <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            P{team.position} · {selectedSeason}
          </p>
          <h2 className="mt-3 font-(--f1b) text-[clamp(1.8rem,5vw,3rem)] leading-none tracking-[-0.04em] text-(--text-color)">
            {teamName}
            <span
              className={`mt-2 block text-lg tracking-[0.02em] ${colorClass}`}
            >
              {t("constructorComparison.summary.campaignSubtitle")}
            </span>
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-(--text-color2)">
            {flagCode && (
              <Flag
                code={flagCode}
                className="h-5 w-7 rounded-sm object-cover"
              />
            )}
            <span>{team.Constructor.nationality}</span>
            <span aria-hidden="true" className="text-(--color3)">
              •
            </span>
            <span>
              {t("constructorComparison.summary.classifiedDrivers", {
                count: driverCount,
                formattedCount: formatNumber(driverCount, currentLanguage),
              })}
            </span>
          </div>
        </div>
        <div className="flex justify-center min-[560px]:justify-end">
          {teamImg ? (
            <img
              src={teamImg}
              alt={t("constructorComparison.summary.logoAlt", {
                team: teamName,
              })}
              className="h-24 w-44 object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.16)]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-(--background-color) font-(--f1b) text-3xl text-(--color3)">
              {getTeamInitials(teamName)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 min-[560px]:grid-cols-4">
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("constructorComparison.summary.points")}
          </p>
          <p className={statValueClass}>
            {formatNumber(parseNumber(team.points), currentLanguage)}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("constructorComparison.summary.wins")}
          </p>
          <p className={statValueClass}>
            {formatNumber(parseNumber(team.wins), currentLanguage)}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("constructorComparison.summary.drivers")}
          </p>
          <p className={statValueClass}>
            {formatNumber(driverCount, currentLanguage)}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("constructorComparison.summary.averagePerDriver")}
          </p>
          <p className={statValueClass}>
            {formatNumber(averagePoints, currentLanguage, {
              maximumFractionDigits: 1,
            })}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 min-[720px]:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("constructorComparison.summary.leadDriver")}
          </p>
          <p className="mt-2 font-(--f1b) text-base text-(--text-color)">
            {leadDriver
              ? `${driverName(leadDriver)} · ${formatPositionLabel(
                  leadDriver.position,
                  t
                )}`
              : t("constructorComparison.summary.leadDriverUnavailable")}
          </p>
          {leadDriver ? (
            <p className="mt-2 text-sm text-(--text-color3)">
              {t("constructorComparison.summary.driverPoints", {
                points: formatNumber(
                  parseNumber(leadDriver.points),
                  currentLanguage
                ),
              })}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("constructorComparison.summary.classifiedDriversHeading")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {drivers.length > 0 ? (
              drivers.map((driver) => (
                <Link
                  key={driver.Driver.driverId}
                  to="/driver/$id"
                  params={{ id: driver.Driver.driverId }}
                  search={seasonSearchParams(selectedSeason)}
                  className="rounded-full border border-(--background-color2) px-3 py-2 text-sm text-(--text-color2) transition-colors hover:border-(--color3) hover:text-(--color3)"
                >
                  {t("constructorComparison.summary.driverPill", {
                    familyName: driver.Driver.familyName,
                    points: formatNumber(
                      parseNumber(driver.points),
                      currentLanguage
                    ),
                  })}
                </Link>
              ))
            ) : (
              <p className="text-sm text-(--text-color3)">
                {t("constructorComparison.summary.driversUnavailable")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="font-(--f1b) text-sm text-(--text-color2)">
          {t("constructorComparison.summary.teamStanding", {
            position: team.position,
            points: formatNumber(parseNumber(team.points), currentLanguage),
          })}
        </span>
        <Link
          to="/constructor/$id"
          params={{ id: team.Constructor.constructorId }}
          search={seasonSearchParams(selectedSeason)}
          className="rounded-full border border-(--color3) px-4 py-2 text-sm font-(--f1b) text-(--color3) transition-colors hover:bg-(--color3) hover:text-white"
        >
          {t("constructorComparison.summary.viewProfile")}
        </Link>
      </div>
    </article>
  );
}

function ComparisonMetricRow({
  metric,
  leftName,
  rightName,
}: {
  metric: Metric;
  leftName: string;
  rightName: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const leftScore = metric.lowerIsBetter
    ? Math.max(metric.leftValue, metric.rightValue) - metric.leftValue + 1
    : metric.leftValue;
  const rightScore = metric.lowerIsBetter
    ? Math.max(metric.leftValue, metric.rightValue) - metric.rightValue + 1
    : metric.rightValue;
  const maxScore = Math.max(leftScore, rightScore, 1);
  const leftWidth = `${Math.max((leftScore / maxScore) * 100, 8)}%`;
  const rightWidth = `${Math.max((rightScore / maxScore) * 100, 8)}%`;
  const isEven = metric.leftValue === metric.rightValue;
  const leftLeads = metric.lowerIsBetter
    ? metric.leftValue < metric.rightValue
    : metric.leftValue > metric.rightValue;
  const leader = leftLeads ? leftName : rightName;
  const delta = Math.abs(metric.leftValue - metric.rightValue);
  const summary = isEven
    ? t("constructorComparison.metrics.evenlyMatched")
    : t("constructorComparison.metrics.leaderSummary", {
        leader,
        delta: formatUnit(delta, metric.unitKey, currentLanguage, t),
      });

  return (
    <div className="rounded-2xl border border-(--background-color2) bg-(--background-color) p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-(--f1b) text-sm text-(--text-color)">
          {metric.label}
        </h3>
        <p className="text-right text-xs font-(--f1r) text-(--text-color3)">
          {summary}
        </p>
      </div>
      <div className="grid gap-3 min-[640px]:grid-cols-[1fr_auto_1fr] min-[640px]:items-center">
        <div>
          <p className="mb-1 text-sm font-(--f1b) text-(--text-color2)">
            {metric.leftDisplay}
          </p>
          <div className="h-2.5 rounded-full bg-(--background-buttons)">
            <div
              className="h-full rounded-full bg-(--color3)"
              style={{ width: leftWidth }}
            />
          </div>
        </div>
        <span className="hidden rounded-full bg-(--background-buttons) px-3 py-1 text-xs font-(--f1b) text-(--text-color3) min-[640px]:inline-flex">
          {t("constructorComparison.versusAbbreviation")}
        </span>
        <div className="min-[640px]:text-right">
          <p className="mb-1 text-sm font-(--f1b) text-(--text-color2)">
            {metric.rightDisplay}
          </p>
          <div className="h-2.5 rounded-full bg-(--background-buttons)">
            <div
              className="ml-auto h-full rounded-full bg-(--color1)"
              style={{ width: rightWidth }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstructorStrengthRadarChart({
  metrics,
  leftName,
  rightName,
  selectedSeason,
  isTimelineLoading,
}: {
  metrics: ConstructorStrengthRadarMetric[];
  leftName: string;
  rightName: string;
  selectedSeason: string;
  isTimelineLoading: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const width = 560;
  const height = 480;
  const center = { x: width / 2, y: height / 2 };
  const radius = 150;
  const levels = [0.25, 0.5, 0.75, 1];
  const getPoint = (index: number, score: number) => {
    const angle = -Math.PI / 2 + (index / metrics.length) * Math.PI * 2;
    const distance = radius * (score / 100);

    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  };
  const toLevelPoints = (score: number): string =>
    metrics
      .map((_, index) => {
        const point = getPoint(index, score);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  const toMetricPoints = (side: "left" | "right"): string =>
    metrics
      .map((metric, index) => {
        const point = getPoint(
          index,
          side === "left" ? metric.leftScore : metric.rightScore
        );
        return `${point.x},${point.y}`;
      })
      .join(" ");
  const biggestGap = metrics.reduce((largest, metric) => {
    const currentGap = Math.abs(metric.leftScore - metric.rightScore);
    const largestGap = Math.abs(largest.leftScore - largest.rightScore);

    return currentGap > largestGap ? metric : largest;
  }, metrics[0]);
  const gapLeader =
    biggestGap.leftScore === biggestGap.rightScore
      ? t("constructorComparison.radar.neitherTeam")
      : biggestGap.leftScore > biggestGap.rightScore
        ? leftName
        : rightName;
  const gapValue = Math.abs(biggestGap.leftScore - biggestGap.rightScore);
  const biggestEdgeSummary =
    gapValue === 0
      ? t("constructorComparison.radar.noBiggestEdge")
      : t("constructorComparison.radar.biggestEdge", {
          leader: gapLeader,
          metric: biggestGap.label,
          delta: formatUnit(gapValue, "radarPoint", currentLanguage, t),
        });

  return (
    <section
      className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="constructor-strengths-title"
    >
      <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("constructorComparison.radar.eyebrow")}
          </p>
          <h2
            id="constructor-strengths-title"
            className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
          >
            {t("constructorComparison.radar.heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          {t("constructorComparison.radar.description", {
            season: selectedSeason,
          })}
        </p>
      </div>

      <div className="mt-5 grid gap-5 min-[980px]:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)] min-[980px]:items-center">
        <div className="overflow-x-auto rounded-3xl bg-(--background-color) p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t("constructorComparison.radar.chartAriaLabel", {
              leftName,
              rightName,
              season: selectedSeason,
            })}
            className="mx-auto min-w-lg max-w-full"
          >
            {levels.map((level) => (
              <polygon
                key={level}
                points={toLevelPoints(level * 100)}
                fill="none"
                stroke="var(--background-color2)"
                strokeDasharray={level === 1 ? undefined : "4 6"}
              />
            ))}
            {metrics.map((metric, index) => {
              const outerPoint = getPoint(index, 100);
              const labelPoint = getPoint(index, 124);

              return (
                <g key={metric.label}>
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
                    className="fill-(--text-color2) text-[11px] font-(--f1b)"
                  >
                    {metric.label}
                  </text>
                </g>
              );
            })}
            <polygon
              points={toMetricPoints("left")}
              fill="var(--color3)"
              fillOpacity="0.22"
              stroke="var(--color3)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <polygon
              points={toMetricPoints("right")}
              fill="var(--color1)"
              fillOpacity="0.18"
              stroke="var(--color1)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {metrics.map((metric, index) => {
              const leftPoint = getPoint(index, metric.leftScore);
              const rightPoint = getPoint(index, metric.rightScore);

              return (
                <g key={`${metric.label}-markers`} aria-hidden="true">
                  <circle
                    cx={leftPoint.x}
                    cy={leftPoint.y}
                    r="5"
                    fill="var(--color3)"
                    stroke="var(--background-buttons)"
                    strokeWidth="2"
                  />
                  <circle
                    cx={rightPoint.x}
                    cy={rightPoint.y}
                    r="5"
                    fill="var(--color1)"
                    stroke="var(--background-buttons)"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
            <text
              x={center.x}
              y={center.y + 4}
              textAnchor="middle"
              className="fill-(--text-color3) text-[12px] font-(--f1b)"
            >
              {t("constructorComparison.radar.scoreScale")}
            </text>
          </svg>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
            <div className="flex flex-wrap gap-3 text-sm font-(--f1b)">
              <span className="inline-flex items-center gap-2 text-(--text-color2)">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-(--color3)"
                  aria-hidden="true"
                />
                {leftName}
              </span>
              <span className="inline-flex items-center gap-2 text-(--text-color2)">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-(--color1)"
                  aria-hidden="true"
                />
                {rightName}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-(--text-color2)">
              {biggestEdgeSummary}
            </p>
            {isTimelineLoading && (
              <p className="mt-2 text-xs leading-5 text-(--text-color3)">
                {t("constructorComparison.radar.timelineLoading")}
              </p>
            )}
          </div>

          <dl className="grid gap-3 min-[560px]:grid-cols-2 min-[980px]:grid-cols-1 min-[1160px]:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4"
              >
                <dt className="font-(--f1b) text-sm text-(--text-color)">
                  {metric.label}
                </dt>
                <dd className="mt-3 grid gap-2 text-xs font-(--f1b) text-(--text-color2)">
                  <span className="flex items-center justify-between gap-3">
                    <span>{leftName}</span>
                    <span className="text-(--color3)">
                      {t("constructorComparison.radar.scoreSummary", {
                        display: metric.leftDisplay,
                        score: metric.leftScore,
                      })}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span>{rightName}</span>
                    <span className="text-(--color1)">
                      {t("constructorComparison.radar.scoreSummary", {
                        display: metric.rightDisplay,
                        score: metric.rightScore,
                      })}
                    </span>
                  </span>
                </dd>
                <dd className="mt-3 text-xs leading-5 text-(--text-color3)">
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

function ConstructorPointsProgressionChart({
  timeline,
  leftTeam,
  rightTeam,
  isLoading,
  isError,
}: {
  timeline: ConstructorStandingsTimelineRound[];
  leftTeam: ConstructorStanding;
  rightTeam: ConstructorStanding;
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [activeConstructorId, setActiveConstructorId] = useState<string | null>(
    null
  );
  const [activeRound, setActiveRound] = useState<string | null>(null);
  const progression = useMemo(
    () => buildConstructorPointsProgression(timeline, leftTeam, rightTeam),
    [leftTeam, rightTeam, timeline]
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
        className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="constructor-points-progression-title"
      >
        <h2
          id="constructor-points-progression-title"
          className="font-(--f1b) text-2xl text-(--text-color)"
        >
          {t("constructorComparison.pointsProgression.heading")}
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          {t("constructorComparison.pointsProgression.loading")}
        </p>
      </section>
    );
  }

  if (isError || progression.length === 0 || rounds.length === 0) {
    return (
      <section
        className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="constructor-points-progression-title"
      >
        <h2
          id="constructor-points-progression-title"
          className="font-(--f1b) text-2xl text-(--text-color)"
        >
          {t("constructorComparison.pointsProgression.heading")}
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          {t("constructorComparison.pointsProgression.unavailable")}
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
        series: ConstructorProgressionSeries;
        point: ConstructorProgressionPoint;
      } => Boolean(entry.point)
    )
    .sort((left, right) => right.point.points - left.point.points);

  return (
    <section
      className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="constructor-points-progression-title"
    >
      <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("constructorComparison.pointsProgression.eyebrow")}
          </p>
          <h2
            id="constructor-points-progression-title"
            className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
          >
            {t("constructorComparison.pointsProgression.heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          {t("constructorComparison.pointsProgression.description")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-(--f1b) text-(--text-color2)">
        {progression.map((series) => (
          <span
            key={series.constructorId}
            className="inline-flex items-center gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: series.color }}
              aria-hidden="true"
            />
            {series.constructorName}
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl bg-(--background-color) p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t(
            "constructorComparison.pointsProgression.chartAriaLabel"
          )}
          className="min-w-3xl"
          onMouseLeave={() => {
            setActiveConstructorId(null);
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
                  {formatNumber(tick, currentLanguage)}
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
              activeConstructorId !== null &&
              activeConstructorId !== series.constructorId;

            return (
              <polyline
                key={series.constructorId}
                points={line}
                fill="none"
                stroke={series.color}
                strokeWidth={
                  activeConstructorId === series.constructorId ? 4 : 2.5
                }
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isDimmed ? 0.28 : 0.95}
              />
            );
          })}
          {progression.flatMap((series) =>
            series.points.map((point) => (
              <circle
                key={`${series.constructorId}-${point.round}`}
                cx={getX(point.round)}
                cy={getY(point.points)}
                r={
                  activeConstructorId === series.constructorId &&
                  activeRound === point.round
                    ? 5.5
                    : 3.8
                }
                fill={series.color}
                stroke="var(--background-buttons)"
                strokeWidth="2"
                role="button"
                tabIndex={0}
                aria-label={t(
                  "constructorComparison.pointsProgression.markerAriaLabel",
                  {
                    round: point.round,
                    raceName: point.raceName,
                    constructorName: series.constructorName,
                    count: point.points,
                    points: formatNumber(point.points, currentLanguage),
                    position: point.positionLabel,
                  }
                )}
                className="cursor-pointer outline-none transition-all focus-visible:stroke-(--text-color)"
                onMouseEnter={() => {
                  setActiveConstructorId(series.constructorId);
                  setActiveRound(point.round);
                }}
                onFocus={() => {
                  setActiveConstructorId(series.constructorId);
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
                {formatRoundLabel(round.round, t)}
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
            {t("constructorComparison.pointsProgression.selectedRound")}
          </p>
          <p className="mt-2 font-(--f1b) text-(--text-color)">
            {formatRoundLabel(activeRoundData.round, t)} ·{" "}
            {activeRoundData.raceName}
          </p>
          <p className="mt-1 text-sm text-(--text-color3)">
            {formatRaceDate(
              activeRoundData.date,
              currentLanguage,
              t("constructorComparison.dateUnavailable")
            )}
          </p>
          <ol className="mt-4 grid gap-2 text-sm min-[620px]:grid-cols-2">
            {activeStandings.map(({ series, point }) => (
              <li
                key={series.constructorId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-(--background-buttons) px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: series.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-(--f1b) text-(--text-color2)">
                    {series.constructorName}
                  </span>
                </span>
                <span className="shrink-0 text-(--text-color3)">
                  {t(
                    "constructorComparison.pointsProgression.standingSummary",
                    {
                      position: point.positionLabel,
                      points: formatNumber(point.points, currentLanguage),
                    }
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function ConstructorComparison(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const {
    constructor1: requestedConstructor1,
    constructor2: requestedConstructor2,
  } = useRouterState({
    select: (state) => state.location.search as ConstructorComparisonSearch,
  });
  const { data, isLoading, error } = useConstructorStandings(selectedSeason);
  const constructors = useMemo<ConstructorStanding[]>(() => data ?? [], [data]);
  const options = useMemo(
    () => constructors.map(constructorOption),
    [constructors]
  );

  const setConstructorSearch = useCallback(
    (constructor1: string, constructor2: string): void => {
      const updateSearch: ConstructorComparisonSearchUpdater = (previous) => ({
        ...previous,
        ...constructorComparisonSearchParams(constructor1, constructor2),
      });

      void navigate({ search: updateSearch as never });
    },
    [navigate]
  );

  useEffect(() => {
    document.title = t("constructorComparison.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    if (error) {
      console.error(
        "Error fetching constructor standings for comparison:",
        error
      );
    }
  }, [error]);

  const selectedConstructors = useMemo(() => {
    if (constructors.length < 2) {
      return null;
    }

    const leftConstructor =
      constructors.find(
        (team) => team.Constructor.constructorId === requestedConstructor1
      ) ?? constructors[0];
    const leftSelectedId = leftConstructor.Constructor.constructorId;
    const rightConstructor =
      constructors.find(
        (team) =>
          team.Constructor.constructorId === requestedConstructor2 &&
          team.Constructor.constructorId !== leftSelectedId
      ) ??
      constructors.find(
        (team) => team.Constructor.constructorId !== leftSelectedId
      ) ??
      constructors[1];

    return { leftConstructor, rightConstructor };
  }, [constructors, requestedConstructor1, requestedConstructor2]);

  const leftConstructor = selectedConstructors?.leftConstructor;
  const rightConstructor = selectedConstructors?.rightConstructor;
  const leftConstructorId = leftConstructor?.Constructor.constructorId;
  const rightConstructorId = rightConstructor?.Constructor.constructorId;

  const leftDriversQuery = useDriversByConstructor(
    leftConstructorId,
    selectedSeason
  );
  const rightDriversQuery = useDriversByConstructor(
    rightConstructorId,
    selectedSeason
  );
  const leftRaceResultsQuery = useConstructorRaceResults(
    leftConstructorId,
    selectedSeason,
    { enabled: !isLoading && Boolean(leftConstructorId) }
  );
  const rightRaceResultsQuery = useConstructorRaceResults(
    rightConstructorId,
    selectedSeason,
    { enabled: !isLoading && Boolean(rightConstructorId) }
  );
  const timelineQuery = useConstructorStandingsTimeline(selectedSeason, {
    enabled: !isLoading && Boolean(leftConstructorId && rightConstructorId),
  });

  useEffect(() => {
    if (leftDriversQuery.error) {
      console.error(
        "Error fetching left constructor drivers:",
        leftDriversQuery.error
      );
    }
  }, [leftDriversQuery.error]);

  useEffect(() => {
    if (rightDriversQuery.error) {
      console.error(
        "Error fetching right constructor drivers:",
        rightDriversQuery.error
      );
    }
  }, [rightDriversQuery.error]);

  useEffect(() => {
    if (leftRaceResultsQuery.error) {
      console.error(
        "Error fetching left constructor race results:",
        leftRaceResultsQuery.error
      );
    }
  }, [leftRaceResultsQuery.error]);

  useEffect(() => {
    if (rightRaceResultsQuery.error) {
      console.error(
        "Error fetching right constructor race results:",
        rightRaceResultsQuery.error
      );
    }
  }, [rightRaceResultsQuery.error]);

  useEffect(() => {
    if (timelineQuery.error) {
      console.error(
        "Error fetching constructor standings timeline:",
        timelineQuery.error
      );
    }
  }, [timelineQuery.error]);

  useEffect(() => {
    if (!leftConstructorId || !rightConstructorId) {
      return;
    }

    const nextSearch = constructorComparisonSearchParams(
      leftConstructorId,
      rightConstructorId
    );

    if (
      requestedConstructor1 === nextSearch.constructor1 &&
      requestedConstructor2 === nextSearch.constructor2
    ) {
      return;
    }

    const updateSearch: ConstructorComparisonSearchUpdater = (previous) => ({
      ...previous,
      ...nextSearch,
    });

    void navigate({ search: updateSearch as never });
  }, [
    leftConstructorId,
    navigate,
    requestedConstructor1,
    requestedConstructor2,
    rightConstructorId,
  ]);

  const leftDrivers = useMemo(
    () => getTeamStats(leftDriversQuery.data).drivers,
    [leftDriversQuery.data]
  );
  const rightDrivers = useMemo(
    () => getTeamStats(rightDriversQuery.data).drivers,
    [rightDriversQuery.data]
  );

  const isDriverDataLoading =
    (Boolean(leftConstructorId) && leftDriversQuery.isLoading) ||
    (Boolean(rightConstructorId) && rightDriversQuery.isLoading);
  const isRaceResultsLoading =
    (Boolean(leftConstructorId) && leftRaceResultsQuery.isLoading) ||
    (Boolean(rightConstructorId) && rightRaceResultsQuery.isLoading);

  if (isLoading || isDriverDataLoading || isRaceResultsLoading) {
    return <ConstructorComparisonPageSkeleton selectedSeason={selectedSeason} />;
  }

  if (!leftConstructor || !rightConstructor) {
    return (
      <main className="mx-auto w-[min(100%-2rem,80rem)] py-8">
        <EmptyState
          title={t("constructorComparison.empty.title")}
          message={t("constructorComparison.empty.message", {
            season: selectedSeason,
          })}
        />
      </main>
    );
  }

  const leftName = leftConstructor.Constructor.name;
  const rightName = rightConstructor.Constructor.name;
  const leftStats = getTeamStats(leftDrivers);
  const rightStats = getTeamStats(rightDrivers);
  const leftPosition = parseNumber(leftConstructor.position);
  const rightPosition = parseNumber(rightConstructor.position);
  const leftPoints = parseNumber(leftConstructor.points);
  const rightPoints = parseNumber(rightConstructor.points);
  const leftWins = parseNumber(leftConstructor.wins);
  const rightWins = parseNumber(rightConstructor.wins);
  const leftPodiums = getConstructorPodiumFinishes(leftRaceResultsQuery.data);
  const rightPodiums = getConstructorPodiumFinishes(rightRaceResultsQuery.data);

  const metrics: Metric[] = [
    {
      label: t("constructorComparison.metrics.championshipPosition"),
      leftValue: leftPosition,
      rightValue: rightPosition,
      leftDisplay: formatPositionLabel(leftConstructor.position, t),
      rightDisplay: formatPositionLabel(rightConstructor.position, t),
      unitKey: "place",
      lowerIsBetter: true,
    },
    {
      label: t("constructorComparison.metrics.pointsScored"),
      leftValue: leftPoints,
      rightValue: rightPoints,
      leftDisplay: formatPoints(leftPoints, currentLanguage, t),
      rightDisplay: formatPoints(rightPoints, currentLanguage, t),
      unitKey: "point",
    },
    {
      label: t("constructorComparison.metrics.raceWins"),
      leftValue: leftWins,
      rightValue: rightWins,
      leftDisplay: formatUnit(leftWins, "win", currentLanguage, t),
      rightDisplay: formatUnit(rightWins, "win", currentLanguage, t),
      unitKey: "win",
    },
    {
      label: t("constructorComparison.metrics.podiumFinishes"),
      leftValue: leftPodiums,
      rightValue: rightPodiums,
      leftDisplay: formatUnit(leftPodiums, "podium", currentLanguage, t),
      rightDisplay: formatUnit(rightPodiums, "podium", currentLanguage, t),
      unitKey: "podium",
    },
    {
      label: t("constructorComparison.metrics.classifiedDrivers"),
      leftValue: leftStats.driverCount,
      rightValue: rightStats.driverCount,
      leftDisplay: formatUnit(
        leftStats.driverCount,
        "driver",
        currentLanguage,
        t
      ),
      rightDisplay: formatUnit(
        rightStats.driverCount,
        "driver",
        currentLanguage,
        t
      ),
      unitKey: "driver",
    },
    {
      label: t("constructorComparison.metrics.averagePointsPerDriver"),
      leftValue: leftStats.averagePoints,
      rightValue: rightStats.averagePoints,
      leftDisplay: formatPoints(leftStats.averagePoints, currentLanguage, t),
      rightDisplay: formatPoints(rightStats.averagePoints, currentLanguage, t),
      unitKey: "point",
    },
  ];

  if (leftStats.leadDriver && rightStats.leadDriver) {
    metrics.push({
      label: t("constructorComparison.metrics.bestPlacedDriver"),
      leftValue: parseNumber(leftStats.leadDriver.position),
      rightValue: parseNumber(rightStats.leadDriver.position),
      leftDisplay: `${leftStats.leadDriver.Driver.familyName} · ${formatPositionLabel(
        leftStats.leadDriver.position,
        t
      )}`,
      rightDisplay: `${rightStats.leadDriver.Driver.familyName} · ${formatPositionLabel(
        rightStats.leadDriver.position,
        t
      )}`,
      unitKey: "place",
      lowerIsBetter: true,
    });
  }

  const strengthMetrics = buildConstructorStrengthRadarMetrics({
    leftTeam: leftConstructor,
    rightTeam: rightConstructor,
    leftStats,
    rightStats,
    timeline: timelineQuery.data ?? [],
    language: currentLanguage,
    t,
  });

  return (
    <main className="mx-auto w-[min(100%-2rem,80rem)] py-8 text-(--text-color)">
      <section className="rounded-4xl border border-(--background-color2) bg-[radial-gradient(circle_at_top_left,rgba(196,32,33,0.16),transparent_35%),var(--background-buttons)] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.08)] min-[900px]:p-8">
        <p className="font-(--f1b) text-xs uppercase tracking-[0.24em] text-(--color3)">
          {t("constructorComparison.hero.eyebrow", { season: selectedSeason })}
        </p>
        <div className="mt-3 grid gap-5 min-[900px]:grid-cols-[1.2fr_0.8fr] min-[900px]:items-end">
          <div>
            <h1 className="font-(--f1b) text-[clamp(2.2rem,7vw,5.2rem)] leading-none tracking-[-0.06em]">
              {t("constructorComparison.hero.heading")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-(--text-color2) min-[720px]:text-base">
              {t("constructorComparison.hero.description")}
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
            <ConstructorSelect
              id="left-constructor"
              label={t("constructorComparison.selectors.constructorOne")}
              value={leftConstructor.Constructor.constructorId}
              options={options}
              disabledConstructorId={rightConstructor.Constructor.constructorId}
              onChange={(value) =>
                setConstructorSearch(
                  value,
                  rightConstructor.Constructor.constructorId
                )
              }
            />
            <ConstructorSelect
              id="right-constructor"
              label={t("constructorComparison.selectors.constructorTwo")}
              value={rightConstructor.Constructor.constructorId}
              options={options}
              disabledConstructorId={leftConstructor.Constructor.constructorId}
              onChange={(value) =>
                setConstructorSearch(
                  leftConstructor.Constructor.constructorId,
                  value
                )
              }
            />
          </div>
          <ShareComparisonButton
            selectedSeason={selectedSeason}
            leftTeam={leftConstructor}
            rightTeam={rightConstructor}
          />
        </div>
      </section>

      <section
        className="mt-6 grid gap-5 min-[1040px]:grid-cols-2"
        aria-label={t("constructorComparison.selectedConstructorsAriaLabel")}
      >
        <ConstructorSummaryCard
          team={leftConstructor}
          drivers={leftDrivers}
          selectedSeason={selectedSeason}
        />
        <ConstructorSummaryCard
          team={rightConstructor}
          drivers={rightDrivers}
          selectedSeason={selectedSeason}
        />
      </section>

      <ConstructorStrengthRadarChart
        metrics={strengthMetrics}
        leftName={leftName}
        rightName={rightName}
        selectedSeason={selectedSeason}
        isTimelineLoading={timelineQuery.isLoading}
      />

      <ConstructorPointsProgressionChart
        timeline={timelineQuery.data ?? []}
        leftTeam={leftConstructor}
        rightTeam={rightConstructor}
        isLoading={timelineQuery.isLoading}
        isError={Boolean(timelineQuery.error)}
      />

      <section
        className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="performance-title"
      >
        <div className="mb-5 flex flex-col gap-2 min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
          <div>
            <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
              {t("constructorComparison.performance.eyebrow")}
            </p>
            <h2
              id="performance-title"
              className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
            >
              {t("constructorComparison.matchupTitle", { leftName, rightName })}
            </h2>
          </div>
          <p className="text-sm text-(--text-color3)">
            {t("constructorComparison.performance.description")}
          </p>
        </div>
        <div className="grid gap-4">
          {metrics.map((metric) => (
            <ComparisonMetricRow
              key={metric.label}
              metric={metric}
              leftName={leftName}
              rightName={rightName}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default ConstructorComparison;
