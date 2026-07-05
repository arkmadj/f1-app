import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import Flag from "react-world-flags";
import { useTranslation } from "react-i18next";
import countryCode from "../../domain/f1/countryCode";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useAllQualifyingResults } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";
import QualifyingPageSkeleton from "./QualifyingPageSkeleton";
import {
  buildQualifyingPerformance,
  formatAveragePosition,
} from "./qualifyingPerformance";
import type { QualifyingRaceWithResults } from "../../services/api/racesApi";

type SortOrder = "earliest" | "latest";

const INITIAL_RENDER_TIME = Date.now();

const surfaceClass =
  "border border-[rgba(196,32,33,0.16)] bg-(--navbar-background) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const chartCardClass =
  "rounded-[1.75rem] border border-(--background-color2) bg-(--background-buttons) p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] min-[900px]:p-6";
const statLabelClass =
  "text-[0.68rem] font-['F1_Bold'] uppercase tracking-[0.18em] text-(--text-color3)";

const toTimestamp = (quali: QualifyingRaceWithResults): number =>
  new Date(quali.date).getTime();

const sortByDate = (
  qualifyings: readonly QualifyingRaceWithResults[],
  order: SortOrder
): QualifyingRaceWithResults[] => {
  const direction = order === "latest" ? -1 : 1;
  return [...qualifyings].sort(
    (a, b) => direction * (toTimestamp(a) - toTimestamp(b))
  );
};

function QualifyingPerformanceChart({
  qualifyings,
  selectedSeason,
}: {
  qualifyings: QualifyingRaceWithResults[];
  selectedSeason: string;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const performance = useMemo(
    () => buildQualifyingPerformance(qualifyings),
    [qualifyings]
  );
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const formatPosition = (position: number): string =>
    formatAveragePosition(position, currentLanguage);

  if (performance.length === 0) {
    return null;
  }

  const topPerformers = performance.slice(0, 10);
  const activeDriver =
    topPerformers.find((driver) => driver.driverId === activeDriverId) ??
    topPerformers[0];
  const poleLeader = performance.reduce((leader, driver) => {
    if (driver.poles > leader.poles) {
      return driver;
    }

    if (
      driver.poles === leader.poles &&
      driver.averagePosition < leader.averagePosition
    ) {
      return driver;
    }

    return leader;
  });
  const completedSessions = qualifyings.filter(
    (quali) => quali.results.length > 0
  ).length;
  const width = 760;
  const rowHeight = 46;
  const height = 104 + topPerformers.length * rowHeight;
  const padding = { top: 30, right: 82, bottom: 54, left: 132 };
  const innerWidth = width - padding.left - padding.right;
  const maxAveragePosition = Math.max(
    5,
    Math.ceil(
      Math.max(...topPerformers.map((driver) => driver.averagePosition))
    )
  );
  const xTicks = Array.from(
    new Set([1, Math.ceil((maxAveragePosition + 1) / 2), maxAveragePosition])
  ).sort((left, right) => left - right);
  const getX = (position: number): number =>
    maxAveragePosition === 1
      ? padding.left + innerWidth / 2
      : padding.left + ((position - 1) / (maxAveragePosition - 1)) * innerWidth;
  const getY = (index: number): number => padding.top + index * rowHeight + 18;

  return (
    <section
      className={`${chartCardClass} mt-6`}
      aria-labelledby="qualifying-performance-title"
    >
      <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
        <div>
          <p className="font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("qualifying.performance.eyebrow")}
          </p>
          <h2
            id="qualifying-performance-title"
            className="mt-2 font-['F1_Bold'] text-2xl text-(--text-color)"
          >
            {t("qualifying.performance.heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-(--text-color3)">
          {t("qualifying.performance.description", {
            count: topPerformers.length,
            season: selectedSeason,
          })}
        </p>
      </div>

      <div className="grid gap-3 min-[720px]:grid-cols-3">
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>{t("qualifying.performance.bestAverage")}</p>
          <p className="mt-2 font-['F1_Bold'] text-xl text-(--text-color)">
            {activeDriver.driverName}
          </p>
          <p className="mt-1 text-sm text-(--text-color3)">
            {t("qualifying.performance.bestAverageSummary", {
              average: formatPosition(activeDriver.averagePosition),
              bestPosition: formatPosition(activeDriver.bestPosition),
            })}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>{t("qualifying.performance.poleLeader")}</p>
          <p className="mt-2 font-['F1_Bold'] text-xl text-(--text-color)">
            {poleLeader.driverName}
          </p>
          <p className="mt-1 text-sm text-(--text-color3)">
            {t("qualifying.performance.poles", { count: poleLeader.poles })}
          </p>
        </div>
        <div className="rounded-2xl bg-(--background-color) p-4">
          <p className={statLabelClass}>
            {t("qualifying.performance.sessionsTracked")}
          </p>
          <p className="mt-2 font-['F1_Bold'] text-xl text-(--text-color)">
            {completedSessions}
          </p>
          <p className="mt-1 text-sm text-(--text-color3)">
            {t("qualifying.performance.driversCompared", {
              count: performance.length,
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl bg-(--background-color) p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
            aria-label={t("qualifying.performance.chartAriaLabel", {
              season: selectedSeason,
            })}
          className="min-w-3xl"
          onMouseLeave={() => setActiveDriverId(null)}
        >
          {xTicks.map((tick) => {
            const x = getX(tick);
            return (
              <g key={tick}>
                <line
                  x1={x}
                  x2={x}
                  y1={padding.top - 12}
                  y2={height - padding.bottom + 8}
                  stroke="var(--background-color2)"
                  strokeDasharray="4 6"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 34}
                  textAnchor="middle"
                  className="fill-(--text-color3) text-[11px] font-['F1_Regular']"
                >
                  {formatPosition(tick)}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={height - padding.bottom + 8}
            y2={height - padding.bottom + 8}
            stroke="var(--background-color2)"
          />
          {topPerformers.map((driver, index) => {
            const y = getY(index);
            const averageX = getX(driver.averagePosition);
            const isActive = activeDriver.driverId === driver.driverId;

            return (
              <g
                key={driver.driverId}
                className="cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={t("qualifying.performance.markerAriaLabel", {
                  average: formatPosition(driver.averagePosition),
                  bestPosition: formatPosition(driver.bestPosition),
                  driver: driver.driverName,
                  poles: t("qualifying.performance.poles", {
                    count: driver.poles,
                  }),
                })}
                onMouseEnter={() => setActiveDriverId(driver.driverId)}
                onFocus={() => setActiveDriverId(driver.driverId)}
              >
                <text
                  x={padding.left - 14}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-(--text-color) text-[12px] font-['F1_Bold']"
                >
                  {driver.familyName}
                </text>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--background-color2)"
                  strokeLinecap="round"
                  strokeWidth="10"
                  opacity="0.38"
                />
                <line
                  x1={padding.left}
                  x2={averageX}
                  y1={y}
                  y2={y}
                  stroke={driver.color}
                  strokeLinecap="round"
                  strokeWidth={isActive ? 14 : 10}
                  opacity={isActive ? 1 : 0.82}
                />
                <circle
                  cx={averageX}
                  cy={y}
                  r={isActive ? 8 : 6}
                  fill={driver.color}
                  stroke="var(--background-buttons)"
                  strokeWidth="2"
                />
                <text
                  x={width - padding.right + 12}
                  y={y + 4}
                  className="fill-(--text-color2) text-[12px] font-['F1_Bold']"
                >
                  {formatPosition(driver.averagePosition)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className="mt-4 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4"
        aria-live="polite"
      >
        <p className={statLabelClass}>{t("qualifying.performance.selectedDriver")}</p>
        <div className="mt-3 grid gap-3 text-sm min-[640px]:grid-cols-2 min-[980px]:grid-cols-4">
          <div>
            <p className="font-['F1_Bold'] text-(--text-color)">
              {activeDriver.driverName}
            </p>
            <p className="mt-1 text-(--text-color3)">
              {activeDriver.constructorName}
            </p>
          </div>
          <div>
            <p className={statLabelClass}>{t("qualifying.performance.average")}</p>
            <p className="mt-1 font-['F1_Bold'] text-(--text-color2)">
              {formatPosition(activeDriver.averagePosition)}
            </p>
          </div>
          <div>
            <p className={statLabelClass}>{t("qualifying.performance.range")}</p>
            <p className="mt-1 font-['F1_Bold'] text-(--text-color2)">
              {t("qualifying.performance.rangeDisplay", {
                best: formatPosition(activeDriver.bestPosition),
                worst: formatPosition(activeDriver.worstPosition),
              })}
            </p>
          </div>
          <div>
            <p className={statLabelClass}>{t("qualifying.performance.q3Rate")}</p>
            <p className="mt-1 font-['F1_Bold'] text-(--text-color2)">
              {Math.round(activeDriver.q3Rate * 100)}% ·{" "}
              {activeDriver.q3Appearances}/{activeDriver.appearances}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function QualifyingPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const { data, isLoading, error } = useAllQualifyingResults(selectedSeason);
  const [sortOrder, setSortOrder] = useState<SortOrder>("earliest");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(currentLanguage),
    [currentLanguage]
  );

  useEffect(() => {
    document.title = t("qualifying.metaTitle");
  }, [currentLanguage, t]);

  const toggleSortOrder = (): void => {
    setSortOrder((current) => (current === "earliest" ? "latest" : "earliest"));
  };

  const sortedQuali = useMemo<QualifyingRaceWithResults[]>(() => {
    const pastQuali = (data ?? []).filter(
      (quali) => toTimestamp(quali) <= INITIAL_RENDER_TIME
    );
    return sortByDate(pastQuali, sortOrder);
  }, [data, sortOrder]);

  const listRef = useStaggerFadeIn<HTMLUListElement>({
    selector: "li",
    deps: [sortedQuali.length, sortOrder, selectedSeason],
  });

  if (error) {
    return (
      <div className="mx-auto my-8 max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-center font-['F1_Bold'] text-red-700">
        {t("qualifying.error", { message: (error as Error).message })}
      </div>
    );
  }

  if (isLoading) {
    return <QualifyingPageSkeleton selectedSeason={selectedSeason} />;
  }

  return (
    <div className="mx-auto w-[min(100%-2rem,80rem)] py-8">
      <section
        className={`${surfaceClass} overflow-hidden rounded-[28px]`}
        aria-labelledby="qualifying-page-title"
      >
        <div className="relative p-[clamp(1.25rem,4vw,2.5rem)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2.5 font-['F1_Bold'] text-xs uppercase tracking-[0.22em] text-(--color1)">
                {t("qualifying.hero.eyebrow", { season: selectedSeason })}
              </p>
              <h1
                id="qualifying-page-title"
                className="mb-3 font-['F1_Bold'] text-[clamp(2rem,5vw,4rem)] leading-[1.02] text-(--text-color)"
              >
                {t("qualifying.hero.heading", { season: selectedSeason })}
              </h1>
              <p className="max-w-2xl text-[clamp(0.95rem,1.8vw,1.1rem)] leading-relaxed text-(--text-color2)">
                {t("qualifying.hero.description")}
              </p>
            </div>

            <div className="grid min-w-[min(100%,18rem)] grid-cols-2 gap-3 rounded-3xl bg-(--background-buttons) p-3 max-[480px]:grid-cols-1">
              <div className="rounded-2xl bg-(--background-color) p-4">
                <span className="text-xs uppercase tracking-wide text-(--text-color3)">
                  {t("qualifying.summary.completed")}
                </span>
                <strong className="mt-1 block font-['F1_Bold'] text-[clamp(1.4rem,3vw,2rem)] text-(--text-color)">
                  {sortedQuali.length}
                </strong>
              </div>
              <div className="rounded-2xl bg-(--background-color) p-4">
                <span className="text-xs uppercase tracking-wide text-(--text-color3)">
                  {t("qualifying.summary.view")}
                </span>
                <strong className="mt-1 block font-['F1_Bold'] text-lg capitalize text-(--text-color)">
                  {sortOrder === "latest"
                    ? t("qualifying.summary.viewModes.latest")
                    : t("qualifying.summary.viewModes.chronological")}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <>
        <QualifyingPerformanceChart
          qualifyings={sortedQuali}
          selectedSeason={selectedSeason}
        />
        <section className="mt-6" aria-labelledby="qualifying-list-title">
          <div className="mb-4 flex items-center justify-between gap-4 max-[700px]:flex-col max-[700px]:items-stretch">
            <div>
              <h2
                id="qualifying-list-title"
                className="font-['F1_Bold'] text-[clamp(1.35rem,3vw,2rem)] text-(--text-color)"
              >
                {t("qualifying.list.heading")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-(--text-color2)">
                {sortOrder === "latest"
                  ? t("qualifying.list.latestFirstDescription")
                  : t("qualifying.list.chronologicalDescription")}
              </p>
            </div>

            <button
              className="inline-flex items-center justify-center rounded-full border border-(--color1) bg-(--color1) px-5 py-3 font-['F1_Bold'] text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--color2) focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2 max-[700px]:w-full"
              onClick={toggleSortOrder}
              type="button"
              aria-pressed={sortOrder === "latest"}
            >
              {sortOrder === "earliest"
                ? t("qualifying.sort.latestFirst")
                : t("qualifying.sort.chronologicalOrder")}
            </button>
          </div>

          {sortedQuali.length === 0 ? (
            <EmptyState
              title={t("qualifying.empty.title")}
              message={t("qualifying.empty.message", { season: selectedSeason })}
            />
          ) : (
            <ul
              className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
              ref={listRef}
              aria-label={t("qualifying.list.ariaLabel")}
            >
              {sortedQuali.map(
                (quali: QualifyingRaceWithResults, index: number) => (
                  <li
                    key={`${quali.round}-${index}`}
                    className={`${surfaceClass} group list-none overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(196,32,33,0.14)]`}
                  >
                    <Link
                      to="/qualifying/$round"
                      params={{ round: String(quali.round) }}
                      search={seasonSearchParams(selectedSeason)}
                      className="flex h-full flex-col gap-5 p-5 text-inherit no-underline focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-(--background-buttons) px-3 py-1.5 font-['F1_Bold'] text-xs uppercase tracking-wide text-(--text-color2)">
                          {t("qualifying.list.roundLabel", { round: quali.round })}
                        </span>
                        <span className="text-right text-sm text-(--text-color3)">
                          {dateFormatter.format(new Date(quali.date))}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col gap-2">
                        <p className="font-['F1_Bold'] text-[clamp(1.15rem,2.4vw,1.55rem)] leading-tight text-(--text-color) transition-colors duration-200 group-hover:text-(--color1)">
                          {quali.raceName}
                        </p>
                        <p className="text-sm leading-relaxed text-(--text-color2)">
                          {quali.Circuit.circuitName}
                        </p>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-(--background-buttons-hover) pt-4">
                        <p className="flex min-w-0 items-center gap-2 text-sm text-(--text-color2)">
                          <span>
                            {quali.Circuit.Location.locality},{" "}
                            {quali.Circuit.Location.country}
                          </span>
                          <Flag
                            code={countryCode(quali.Circuit.Location.country)}
                            className="h-5 shrink-0 rounded-xs shadow-sm"
                          />
                        </p>
                        <span className="font-['F1_Bold'] text-sm text-(--color1)">
                          {t("qualifying.list.viewResults")}
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              )}
            </ul>
          )}
        </section>
      </>
    </div>
  );
}

export default QualifyingPage;
