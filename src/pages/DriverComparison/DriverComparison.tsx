import { useCallback, useEffect, useMemo, useState } from "react";
import Flag from "react-world-flags";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import EmptyState from "../../components/EmptyState/EmptyState";
import {
  useDriverStandings,
  useDriverStandingsTimeline,
} from "../../hooks/queries";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import { seasonSearchParams } from "../../domain/f1/seasons";
import {
  driverComparisonSearchParams,
  type DriverComparisonSearch,
} from "../../domain/f1/driverComparisonSearch";
import { getDriverImage } from "../../domain/f1/driversImage";
import { nationalityCountryCode } from "../../domain/f1/images";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import teamColorClass from "../../domain/f1/teamColorClass";
import type { DriverStanding } from "../../services/api/constructorsApi";
import type { DriverStandingsTimelineRound } from "../../services/api/testapi";
import DriverComparisonPageSkeleton from "./DriverComparisonPageSkeleton";

const colorClasses = teamColorClass as Record<string, string | undefined>;

const cardBase =
  "rounded-[1.75rem] border border-(--background-color2) bg-(--background-buttons) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const statLabelClass =
  "text-[0.68rem] font-(--f1b) uppercase tracking-[0.18em] text-(--text-color3)";
const statValueClass = "mt-2 font-(--f1b) text-xl text-(--text-color)";

type DriverComparisonSearchUpdater = (previous: {
  season?: string;
  driver1?: string;
  driver2?: string;
}) => {
  season?: string;
  driver1?: string;
  driver2?: string;
};

interface DriverOptionProps {
  id: string;
  label: string;
}

type UnitKey = "place" | "point" | "win" | "radarPoint";

interface Metric {
  label: string;
  leftValue: number;
  rightValue: number;
  leftDisplay: string;
  rightDisplay: string;
  unitKey: UnitKey;
  lowerIsBetter?: boolean;
}

interface PointsEvolutionPoint {
  round: string;
  raceName: string;
  date?: string;
  leftPoints: number;
  rightPoints: number;
  leftPosition?: string;
  rightPosition?: string;
}

interface DriverStrengthRadarMetric {
  label: string;
  description: string;
  leftDisplay: string;
  rightDisplay: string;
  leftScore: number;
  rightScore: number;
}

type ShareStatus = "idle" | "shared" | "copied" | "error";

const driverName = (driver: DriverStanding): string =>
  `${driver.Driver.givenName} ${driver.Driver.familyName}`;

const driverOption = (driver: DriverStanding): DriverOptionProps => ({
  id: driver.Driver.driverId,
  label: driverName(driver),
});

const parseNumber = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  const formattedCount = Number.isInteger(value)
    ? formatNumber(value, language)
    : formatNumber(value, language, { maximumFractionDigits: 1 });

  return t(`driverComparison.units.${unitKey}`, {
    count: value,
    formattedCount,
  });
};

const formatPoints = (value: number, language: string, t: TFunction): string =>
  t("driverComparison.pointsDisplay", {
    points: formatNumber(value, language),
  });

const formatPositionLabel = (
  position: string | number | undefined,
  t: TFunction
): string =>
  t("driverComparison.positionLabel", {
    position: position ? String(position) : "—",
  });

const formatRoundLabel = (round: string, t: TFunction): string =>
  t("driverComparison.roundLabel", { round });

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

const buildDriverPointsEvolution = (
  timeline: DriverStandingsTimelineRound[],
  leftDriverId: string,
  rightDriverId: string
): PointsEvolutionPoint[] => {
  let leftPoints = 0;
  let rightPoints = 0;

  return [...timeline]
    .sort(
      (leftRound, rightRound) =>
        parseNumber(leftRound.round) - parseNumber(rightRound.round)
    )
    .map((round) => {
      const leftStanding = round.DriverStandings.find(
        (standing) => standing.Driver.driverId === leftDriverId
      );
      const rightStanding = round.DriverStandings.find(
        (standing) => standing.Driver.driverId === rightDriverId
      );

      leftPoints = leftStanding ? parseNumber(leftStanding.points) : leftPoints;
      rightPoints = rightStanding
        ? parseNumber(rightStanding.points)
        : rightPoints;

      return {
        round: round.round,
        raceName: round.raceName,
        date: round.date,
        leftPoints,
        rightPoints,
        leftPosition: leftStanding?.position,
        rightPosition: rightStanding?.position,
      };
    });
};

const getRecentPointsGain = (
  points: PointsEvolutionPoint[],
  side: "left" | "right"
): number => {
  if (points.length === 0) {
    return 0;
  }

  const finalPoint = points[points.length - 1];
  const windowSize = Math.min(5, points.length);
  const baselineIndex =
    points.length > windowSize ? points.length - windowSize - 1 : -1;
  const baselinePoint = baselineIndex >= 0 ? points[baselineIndex] : undefined;
  const finalPoints =
    side === "left" ? finalPoint.leftPoints : finalPoint.rightPoints;
  const baselinePoints = baselinePoint
    ? side === "left"
      ? baselinePoint.leftPoints
      : baselinePoint.rightPoints
    : 0;

  return Math.max(finalPoints - baselinePoints, 0);
};

const getAverageChampionshipPosition = (
  points: PointsEvolutionPoint[],
  side: "left" | "right"
): number | null =>
  average(
    points
      .map((point) =>
        parseNumber(side === "left" ? point.leftPosition : point.rightPosition)
      )
      .filter((position) => position > 0)
  );

const buildDriverStrengthRadarMetrics = ({
  leftPosition,
  rightPosition,
  leftPoints,
  rightPoints,
  leftWins,
  rightWins,
  pointsEvolution,
  language,
  t,
}: {
  leftPosition: number;
  rightPosition: number;
  leftPoints: number;
  rightPoints: number;
  leftWins: number;
  rightWins: number;
  pointsEvolution: PointsEvolutionPoint[];
  language: string;
  t: TFunction;
}): DriverStrengthRadarMetric[] => {
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
  const hasTimelineData = pointsEvolution.length > 0;
  const leftRecentPoints = hasTimelineData
    ? getRecentPointsGain(pointsEvolution, "left")
    : leftPoints;
  const rightRecentPoints = hasTimelineData
    ? getRecentPointsGain(pointsEvolution, "right")
    : rightPoints;
  const [leftRecentScore, rightRecentScore] = normalizeHigherScore(
    leftRecentPoints,
    rightRecentPoints
  );
  const leftAveragePosition =
    getAverageChampionshipPosition(pointsEvolution, "left") ?? leftPosition;
  const rightAveragePosition =
    getAverageChampionshipPosition(pointsEvolution, "right") ?? rightPosition;
  const [leftConsistencyScore, rightConsistencyScore] = normalizeLowerScore(
    leftAveragePosition,
    rightAveragePosition
  );
  const formatAveragePosition = (value: number): string =>
    t("driverComparison.radar.averagePositionDisplay", {
      position: value
        ? formatNumber(value, language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })
        : "—",
    });

  return [
    {
      label: t("driverComparison.radar.metrics.championshipRank.label"),
      description: t(
        "driverComparison.radar.metrics.championshipRank.description"
      ),
      leftDisplay: formatPositionLabel(leftPosition, t),
      rightDisplay: formatPositionLabel(rightPosition, t),
      leftScore: leftRankScore,
      rightScore: rightRankScore,
    },
    {
      label: t("driverComparison.radar.metrics.pointsHaul.label"),
      description: t("driverComparison.radar.metrics.pointsHaul.description"),
      leftDisplay: formatPoints(leftPoints, language, t),
      rightDisplay: formatPoints(rightPoints, language, t),
      leftScore: leftPointsScore,
      rightScore: rightPointsScore,
    },
    {
      label: t("driverComparison.radar.metrics.winConversion.label"),
      description: t(
        "driverComparison.radar.metrics.winConversion.description"
      ),
      leftDisplay: formatUnit(leftWins, "win", language, t),
      rightDisplay: formatUnit(rightWins, "win", language, t),
      leftScore: leftWinsScore,
      rightScore: rightWinsScore,
    },
    {
      label: t("driverComparison.radar.metrics.recentForm.label"),
      description: hasTimelineData
        ? t("driverComparison.radar.metrics.recentForm.description")
        : t("driverComparison.radar.metrics.recentForm.loadingDescription"),
      leftDisplay: t("driverComparison.radar.recentPointsDisplay", {
        points: formatNumber(leftRecentPoints, language),
      }),
      rightDisplay: t("driverComparison.radar.recentPointsDisplay", {
        points: formatNumber(rightRecentPoints, language),
      }),
      leftScore: leftRecentScore,
      rightScore: rightRecentScore,
    },
    {
      label: t("driverComparison.radar.metrics.consistency.label"),
      description: hasTimelineData
        ? t("driverComparison.radar.metrics.consistency.description")
        : t("driverComparison.radar.metrics.consistency.loadingDescription"),
      leftDisplay: formatAveragePosition(leftAveragePosition),
      rightDisplay: formatAveragePosition(rightAveragePosition),
      leftScore: leftConsistencyScore,
      rightScore: rightConsistencyScore,
    },
  ];
};

const calculateAge = (dateOfBirth: string | undefined): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const buildComparisonShareUrl = (
  selectedSeason: string,
  leftDriverId: string,
  rightDriverId: string
): string => {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const url = new URL("driver-comparison", baseUrl);
  url.searchParams.set("season", selectedSeason);
  url.searchParams.set("driver1", leftDriverId);
  url.searchParams.set("driver2", rightDriverId);

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
      return t("driverComparison.share.status.shared");
    case "copied":
      return t("driverComparison.share.status.copied");
    case "error":
      return t("driverComparison.share.status.error");
    case "idle":
    default:
      return t("driverComparison.share.status.idle");
  }
};

function ShareComparisonButton({
  selectedSeason,
  leftDriver,
  rightDriver,
  leftName,
  rightName,
}: {
  selectedSeason: string;
  leftDriver: DriverStanding;
  rightDriver: DriverStanding;
  leftName: string;
  rightName: string;
}): JSX.Element {
  const { t } = useTranslation();
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const shareUrl = useMemo(
    () =>
      buildComparisonShareUrl(
        selectedSeason,
        leftDriver.Driver.driverId,
        rightDriver.Driver.driverId
      ),
    [leftDriver.Driver.driverId, rightDriver.Driver.driverId, selectedSeason]
  );
  const statusMessage = getShareStatusMessage(shareStatus, t);

  const handleShare = useCallback(async (): Promise<void> => {
    const shareData: ShareData = {
      title: t("driverComparison.share.title", { leftName, rightName }),
      text: t("driverComparison.share.text", {
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

      console.error("Error sharing driver comparison:", error);
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
          ? t("driverComparison.share.copiedButton")
          : t("driverComparison.share.button")}
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

function DriverSelect({
  id,
  label,
  value,
  options,
  disabledDriverId,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: DriverOptionProps[];
  disabledDriverId: string;
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
            disabled={option.id === disabledDriverId}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DriverSummaryCard({
  driver,
  selectedSeason,
}: {
  driver: DriverStanding;
  selectedSeason: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const teamName =
    driver.Constructors[0]?.name ??
    t("driverComparison.summary.independentTeam");
  const portrait = getDriverImage(driver.Driver.driverId, "profile");
  const flagCode = nationalityCountryCode(driver.Driver.nationality);
  const age = calculateAge(driver.Driver.dateOfBirth);
  const teamImg = getTeamLogo(teamName);
  const colorClass = colorClasses[teamName] ?? "text-(--color3)";

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
            P{driver.position ?? "—"} · {selectedSeason}
          </p>
          <h2 className="mt-3 font-(--f1b) text-[clamp(1.8rem,5vw,3rem)] leading-none tracking-[-0.04em] text-(--text-color)">
            {driver.Driver.givenName}
            <span className={`block ${colorClass}`}>
              {driver.Driver.familyName}
            </span>
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-(--text-color2)">
            {flagCode && (
              <Flag
                code={flagCode}
                className="h-5 w-7 rounded-sm object-cover"
              />
            )}
            <span>
              {driver.Driver.nationality ??
                t("driverComparison.summary.nationalityUnavailable")}
            </span>
            <span aria-hidden="true" className="text-(--color3)">
              •
            </span>
            <span>{teamName}</span>
          </div>
        </div>
        <div className="flex justify-center min-[560px]:justify-end">
          {portrait ? (
            <img
              src={portrait}
              alt={t("driverComparison.summary.portraitAlt", {
                driver: driverName(driver),
              })}
              className="h-44 w-44 object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.22)]"
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-(--background-color) font-(--f1b) text-4xl text-(--color3)">
              {driver.Driver.code ??
                driver.Driver.familyName.slice(0, 3).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 min-[560px]:grid-cols-4">
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("driverComparison.summary.points")}
          </p>
          <p className={statValueClass}>
            {formatNumber(parseNumber(driver.points), currentLanguage)}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>{t("driverComparison.summary.wins")}</p>
          <p className={statValueClass}>
            {formatNumber(parseNumber(driver.wins), currentLanguage)}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("driverComparison.summary.number")}
          </p>
          <p className={statValueClass}>
            {driver.Driver.permanentNumber ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>{t("driverComparison.summary.age")}</p>
          <p className={statValueClass}>{age ?? "—"}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {teamImg ? (
          <img
            src={teamImg}
            alt={teamName}
            className="h-8 max-w-32 object-contain"
          />
        ) : (
          <span className="font-(--f1b) text-sm text-(--text-color2)">
            {teamName}
          </span>
        )}
        <Link
          to="/driver/$id"
          params={{ id: driver.Driver.driverId }}
          search={seasonSearchParams(selectedSeason)}
          className="rounded-full border border-(--color3) px-4 py-2 text-sm font-(--f1b) text-(--color3) transition-colors hover:bg-(--color3) hover:text-white"
        >
          {t("driverComparison.summary.viewProfile")}
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
    ? t("driverComparison.metrics.evenlyMatched")
    : t("driverComparison.metrics.leaderSummary", {
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
          {t("driverComparison.versusAbbreviation")}
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

function DriverStrengthRadarChart({
  metrics,
  leftName,
  rightName,
  selectedSeason,
  isTimelineLoading,
}: {
  metrics: DriverStrengthRadarMetric[];
  leftName: string;
  rightName: string;
  selectedSeason: string;
  isTimelineLoading: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const width = 540;
  const height = 460;
  const center = { x: width / 2, y: height / 2 };
  const radius = 142;
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
      ? t("driverComparison.radar.neitherDriver")
      : biggestGap.leftScore > biggestGap.rightScore
        ? leftName
        : rightName;
  const gapValue = Math.abs(biggestGap.leftScore - biggestGap.rightScore);
  const biggestEdgeSummary =
    gapValue === 0
      ? t("driverComparison.radar.noBiggestEdge")
      : t("driverComparison.radar.biggestEdge", {
          leader: gapLeader,
          metric: biggestGap.label,
          delta: formatUnit(gapValue, "radarPoint", currentLanguage, t),
        });

  return (
    <section
      className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="driver-strengths-title"
    >
      <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("driverComparison.radar.eyebrow")}
          </p>
          <h2
            id="driver-strengths-title"
            className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
          >
            {t("driverComparison.radar.heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          {t("driverComparison.radar.description", { season: selectedSeason })}
        </p>
      </div>

      <div className="mt-5 grid gap-5 min-[980px]:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)] min-[980px]:items-center">
        <div className="overflow-x-auto rounded-3xl bg-(--background-color) p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t("driverComparison.radar.chartAriaLabel", {
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
              const labelPoint = getPoint(index, 122);

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
              {t("driverComparison.radar.scoreScale")}
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
                {t("driverComparison.radar.timelineLoading")}
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
                      {t("driverComparison.radar.scoreSummary", {
                        display: metric.leftDisplay,
                        score: metric.leftScore,
                      })}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span>{rightName}</span>
                    <span className="text-(--color1)">
                      {t("driverComparison.radar.scoreSummary", {
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

function PointsEvolutionChart({
  points,
  leftName,
  rightName,
  isLoading,
  isError,
}: {
  points: PointsEvolutionPoint[];
  leftName: string;
  rightName: string;
  isLoading: boolean;
  isError: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePoint = points[activeIndex ?? points.length - 1];

  if (isLoading) {
    return (
      <section
        className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="points-evolution-title"
      >
        <h2
          id="points-evolution-title"
          className="font-(--f1b) text-2xl text-(--text-color)"
        >
          {t("driverComparison.pointsEvolution.heading")}
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          {t("driverComparison.pointsEvolution.loading")}
        </p>
      </section>
    );
  }

  if (isError || points.length === 0) {
    return (
      <section
        className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
        aria-labelledby="points-evolution-title"
      >
        <h2
          id="points-evolution-title"
          className="font-(--f1b) text-2xl text-(--text-color)"
        >
          {t("driverComparison.pointsEvolution.heading")}
        </h2>
        <p className="mt-3 text-sm text-(--text-color3)">
          {t("driverComparison.pointsEvolution.unavailable")}
        </p>
      </section>
    );
  }

  const width = 640;
  const height = 300;
  const padding = { top: 24, right: 28, bottom: 58, left: 58 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(
    1,
    ...points.flatMap((point) => [point.leftPoints, point.rightPoints])
  );
  const yTicks = Array.from(
    new Set([0, Math.ceil(maxPoints / 2), Math.ceil(maxPoints)])
  );
  const getX = (index: number): number =>
    points.length === 1
      ? padding.left + innerWidth / 2
      : padding.left + (index / (points.length - 1)) * innerWidth;
  const getY = (value: number): number =>
    padding.top + innerHeight - (value / maxPoints) * innerHeight;
  const leftLine = points
    .map((point, index) => `${getX(index)},${getY(point.leftPoints)}`)
    .join(" ");
  const rightLine = points
    .map((point, index) => `${getX(index)},${getY(point.rightPoints)}`)
    .join(" ");
  const activeX = activePoint ? getX(points.indexOf(activePoint)) : null;
  const labelInterval = Math.max(1, Math.ceil(points.length / 8));

  const renderPointMarker = (
    point: PointsEvolutionPoint,
    index: number,
    driverNameLabel: string,
    pointsValue: number,
    color: string
  ): JSX.Element => (
    <circle
      key={`${driverNameLabel}-${point.round}`}
      cx={getX(index)}
      cy={getY(pointsValue)}
      r={activeIndex === index ? 5.5 : 4}
      fill={color}
      stroke="var(--background-buttons)"
      strokeWidth="2"
      role="button"
      tabIndex={0}
      aria-label={t("driverComparison.pointsEvolution.markerAriaLabel", {
        round: point.round,
        raceName: point.raceName,
        driverName: driverNameLabel,
        count: pointsValue,
        points: formatNumber(pointsValue, currentLanguage),
      })}
      className="cursor-pointer outline-none transition-all focus-visible:stroke-(--text-color)"
      onMouseEnter={() => setActiveIndex(index)}
      onFocus={() => setActiveIndex(index)}
    />
  );

  return (
    <section
      className={`${cardBase} mt-6 p-5 min-[900px]:p-6`}
      aria-labelledby="points-evolution-title"
    >
      <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-(--f1b) text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("driverComparison.pointsEvolution.eyebrow")}
          </p>
          <h2
            id="points-evolution-title"
            className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
          >
            {t("driverComparison.pointsEvolution.heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          {t("driverComparison.pointsEvolution.description")}
        </p>
      </div>

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

      <div className="mt-4 overflow-x-auto rounded-3xl bg-(--background-color) p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("driverComparison.pointsEvolution.chartAriaLabel", {
            leftName,
            rightName,
          })}
          className="min-w-2xl"
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
          <polyline
            points={leftLine}
            fill="none"
            stroke="var(--color3)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={rightLine}
            fill="none"
            stroke="var(--color1)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) =>
            renderPointMarker(
              point,
              index,
              leftName,
              point.leftPoints,
              "var(--color3)"
            )
          )}
          {points.map((point, index) =>
            renderPointMarker(
              point,
              index,
              rightName,
              point.rightPoints,
              "var(--color1)"
            )
          )}
          {points.map((point, index) =>
            index % labelInterval === 0 || index === points.length - 1 ? (
              <text
                key={point.round}
                x={getX(index)}
                y={height - padding.bottom + 28}
                textAnchor="middle"
                className="fill-(--text-color3) text-[11px] font-(--f1r)"
              >
                {formatRoundLabel(point.round, t)}
              </text>
            ) : null
          )}
        </svg>
      </div>

      {activePoint && (
        <dl
          className="mt-4 grid gap-3 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4 min-[720px]:grid-cols-3"
          aria-live="polite"
        >
          <div>
            <dt className={statLabelClass}>
              {t("driverComparison.pointsEvolution.selectedRound")}
            </dt>
            <dd className="mt-2 font-(--f1b) text-(--text-color)">
              {formatRoundLabel(activePoint.round, t)} · {activePoint.raceName}
            </dd>
            <dd className="mt-1 text-sm text-(--text-color3)">
              {formatRaceDate(
                activePoint.date,
                currentLanguage,
                t("driverComparison.dateUnavailable")
              )}
            </dd>
          </div>
          <div>
            <dt className={statLabelClass}>{leftName}</dt>
            <dd className="mt-2 font-(--f1b) text-xl text-(--color3)">
              {formatPoints(activePoint.leftPoints, currentLanguage, t)}
            </dd>
            <dd className="mt-1 text-sm text-(--text-color3)">
              {formatPositionLabel(activePoint.leftPosition, t)}
            </dd>
          </div>
          <div>
            <dt className={statLabelClass}>{rightName}</dt>
            <dd className="mt-2 font-(--f1b) text-xl text-(--color1)">
              {formatPoints(activePoint.rightPoints, currentLanguage, t)}
            </dd>
            <dd className="mt-1 text-sm text-(--text-color3)">
              {formatPositionLabel(activePoint.rightPosition, t)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function DriverComparison(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const { driver1: requestedDriver1, driver2: requestedDriver2 } =
    useRouterState({
      select: (state) => state.location.search as DriverComparisonSearch,
    });
  const { data, isLoading, error } = useDriverStandings(selectedSeason);
  const drivers = useMemo<DriverStanding[]>(() => data ?? [], [data]);

  const options = useMemo(() => drivers.map(driverOption), [drivers]);

  const setDriverSearch = useCallback(
    (driver1: string, driver2: string): void => {
      const updateSearch: DriverComparisonSearchUpdater = (previous) => ({
        ...previous,
        ...driverComparisonSearchParams(driver1, driver2),
      });

      void navigate({ search: updateSearch as never });
    },
    [navigate]
  );

  useEffect(() => {
    document.title = t("driverComparison.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching driver standings for comparison:", error);
    }
  }, [error]);

  const selectedDrivers = useMemo(() => {
    if (drivers.length < 2) {
      return null;
    }

    const leftDriver =
      drivers.find((driver) => driver.Driver.driverId === requestedDriver1) ??
      drivers[0];
    const leftSelectedId = leftDriver.Driver.driverId;
    const rightDriver =
      drivers.find(
        (driver) =>
          driver.Driver.driverId === requestedDriver2 &&
          driver.Driver.driverId !== leftSelectedId
      ) ??
      drivers.find((driver) => driver.Driver.driverId !== leftSelectedId) ??
      drivers[1];

    return { leftDriver, rightDriver };
  }, [drivers, requestedDriver1, requestedDriver2]);

  const leftDriver = selectedDrivers?.leftDriver;
  const rightDriver = selectedDrivers?.rightDriver;
  const leftDriverId = leftDriver?.Driver.driverId;
  const rightDriverId = rightDriver?.Driver.driverId;
  const timelineQuery = useDriverStandingsTimeline(selectedSeason, {
    enabled: Boolean(leftDriverId && rightDriverId),
  });

  const pointsEvolution = useMemo(() => {
    if (!leftDriverId || !rightDriverId) {
      return [];
    }

    return buildDriverPointsEvolution(
      timelineQuery.data ?? [],
      leftDriverId,
      rightDriverId
    );
  }, [leftDriverId, rightDriverId, timelineQuery.data]);

  useEffect(() => {
    if (!leftDriverId || !rightDriverId) {
      return;
    }

    const nextSearch = driverComparisonSearchParams(
      leftDriverId,
      rightDriverId
    );

    if (
      requestedDriver1 === nextSearch.driver1 &&
      requestedDriver2 === nextSearch.driver2
    ) {
      return;
    }

    const updateSearch: DriverComparisonSearchUpdater = (previous) => ({
      ...previous,
      ...nextSearch,
    });

    void navigate({ search: updateSearch as never });
  }, [
    leftDriverId,
    navigate,
    requestedDriver1,
    requestedDriver2,
    rightDriverId,
  ]);

  useEffect(() => {
    if (timelineQuery.error) {
      console.error(
        "Error fetching driver standings timeline:",
        timelineQuery.error
      );
    }
  }, [timelineQuery.error]);

  if (isLoading) {
    return <DriverComparisonPageSkeleton selectedSeason={selectedSeason} />;
  }

  if (!leftDriver || !rightDriver) {
    return (
      <main className="mx-auto mt-10 w-full max-w-6xl px-3 min-[1490px]:px-0">
        <EmptyState
          title={t("driverComparison.empty.title")}
          message={t("driverComparison.empty.message", {
            season: selectedSeason,
          })}
        />
      </main>
    );
  }

  const leftName = driverName(leftDriver);
  const rightName = driverName(rightDriver);
  const leftPosition = parseNumber(leftDriver.position);
  const rightPosition = parseNumber(rightDriver.position);
  const leftPoints = parseNumber(leftDriver.points);
  const rightPoints = parseNumber(rightDriver.points);
  const leftWins = parseNumber(leftDriver.wins);
  const rightWins = parseNumber(rightDriver.wins);

  const metrics: Metric[] = [
    {
      label: t("driverComparison.metrics.championshipPosition"),
      leftValue: leftPosition,
      rightValue: rightPosition,
      leftDisplay: formatPositionLabel(leftDriver.position, t),
      rightDisplay: formatPositionLabel(rightDriver.position, t),
      unitKey: "place",
      lowerIsBetter: true,
    },
    {
      label: t("driverComparison.metrics.pointsScored"),
      leftValue: leftPoints,
      rightValue: rightPoints,
      leftDisplay: formatPoints(leftPoints, currentLanguage, t),
      rightDisplay: formatPoints(rightPoints, currentLanguage, t),
      unitKey: "point",
    },
    {
      label: t("driverComparison.metrics.raceWins"),
      leftValue: leftWins,
      rightValue: rightWins,
      leftDisplay: formatUnit(leftWins, "win", currentLanguage, t),
      rightDisplay: formatUnit(rightWins, "win", currentLanguage, t),
      unitKey: "win",
    },
  ];
  const radarMetrics = buildDriverStrengthRadarMetrics({
    leftPosition,
    rightPosition,
    leftPoints,
    rightPoints,
    leftWins,
    rightWins,
    pointsEvolution,
    language: currentLanguage,
    t,
  });

  return (
    <main className="mx-auto mt-10 w-full max-w-7xl px-3 text-(--text-color) min-[1490px]:px-0">
      <section className="rounded-4xl border border-(--background-color2) bg-[radial-gradient(circle_at_top_left,rgba(196,32,33,0.16),transparent_35%),var(--background-buttons)] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.08)] min-[900px]:p-8">
        <p className="font-(--f1b) text-xs uppercase tracking-[0.24em] text-(--color3)">
          {t("driverComparison.hero.eyebrow", { season: selectedSeason })}
        </p>
        <div className="mt-3 grid gap-5 min-[900px]:grid-cols-[1.2fr_0.8fr] min-[900px]:items-end">
          <div>
            <h1 className="font-(--f1b) text-[clamp(2.2rem,7vw,5.2rem)] leading-none tracking-[-0.06em]">
              {t("driverComparison.hero.heading")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-(--text-color2) min-[720px]:text-base">
              {t("driverComparison.hero.description")}
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
            <DriverSelect
              id="left-driver"
              label={t("driverComparison.selectors.driverOne")}
              value={leftDriver.Driver.driverId}
              options={options}
              disabledDriverId={rightDriver.Driver.driverId}
              onChange={(value) =>
                setDriverSearch(value, rightDriver.Driver.driverId)
              }
            />
            <DriverSelect
              id="right-driver"
              label={t("driverComparison.selectors.driverTwo")}
              value={rightDriver.Driver.driverId}
              options={options}
              disabledDriverId={leftDriver.Driver.driverId}
              onChange={(value) =>
                setDriverSearch(leftDriver.Driver.driverId, value)
              }
            />
          </div>
          <ShareComparisonButton
            selectedSeason={selectedSeason}
            leftDriver={leftDriver}
            rightDriver={rightDriver}
            leftName={leftName}
            rightName={rightName}
          />
        </div>
      </section>

      <section
        className="mt-6 grid gap-5 min-[1040px]:grid-cols-2"
        aria-label={t("driverComparison.selectedDriversAriaLabel")}
      >
        <DriverSummaryCard
          driver={leftDriver}
          selectedSeason={selectedSeason}
        />
        <DriverSummaryCard
          driver={rightDriver}
          selectedSeason={selectedSeason}
        />
      </section>

      <DriverStrengthRadarChart
        metrics={radarMetrics}
        leftName={leftName}
        rightName={rightName}
        selectedSeason={selectedSeason}
        isTimelineLoading={timelineQuery.isLoading}
      />

      <PointsEvolutionChart
        points={pointsEvolution}
        leftName={leftName}
        rightName={rightName}
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
              {t("driverComparison.performance.eyebrow")}
            </p>
            <h2
              id="performance-title"
              className="mt-2 font-(--f1b) text-2xl text-(--text-color)"
            >
              {leftName} vs {rightName}
            </h2>
          </div>
          <p className="text-sm text-(--text-color3)">
            {t("driverComparison.performance.description")}
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

export default DriverComparison;
