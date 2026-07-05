import { useEffect, useMemo } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useSprintResults } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import SprintResultsPageSkeleton from "./SprintResultsPageSkeleton";

// ---------------------------------------------------------------------------
// Domain types
//
// Shapes mirror the subset of the Ergast / Jolpica sprint-results payload
// consumed by this page. Optional fields reflect that the upstream API
// omits values for retirements (no `Time`), sprints without a recorded
// fastest lap, etc.
// ---------------------------------------------------------------------------

interface SprintResultDriver {
  driverId: string;
  code: string;
}

interface LapTime {
  time?: string;
}

interface FastestLap {
  Time?: LapTime;
}

interface SprintResult {
  position: string;
  points: string;
  status?: string;
  Time?: LapTime;
  FastestLap?: FastestLap;
  Driver: SprintResultDriver;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getFastestLapDriver = (
  results: readonly SprintResult[]
): SprintResult | null => {
  if (!Array.isArray(results) || results.length === 0) return null;

  return results.reduce<SprintResult | null>((fastest, current) => {
    if (!fastest) return current;

    const fastestTime = fastest.FastestLap?.Time?.time;
    const currentTime = current.FastestLap?.Time?.time;

    if (!fastestTime) return current;
    if (!currentTime) return fastest;

    return currentTime < fastestTime ? current : fastest;
  }, null);
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

const getSprintTimeValue = (
  result: SprintResult,
  index: number,
  notAvailableLabel: string
): string => {
  if (index === 0) {
    return result.FastestLap?.Time?.time || notAvailableLabel;
  }

  return result.Time?.time || result.status || notAvailableLabel;
};

const renderDriverName = (
  driver: SprintResultDriver,
  isFastestLap: boolean,
  season: string,
  fastestLapLabel: string
): JSX.Element => {
  const className = isFastestLap
    ? "driver-name fastest-lap inline-flex min-w-0 flex-col gap-1 rounded-xl px-3 py-2 font-bold text-purple-700 transition-colors group-hover:bg-purple-500/10"
    : "driver-name inline-flex min-w-0 flex-col gap-1 rounded-xl px-3 py-2 text-(--text-color) transition-colors group-hover:bg-(--background-buttons)";
  return (
    <Link
      to="/driver/$id"
      params={{ id: driver.driverId }}
      search={seasonSearchParams(season)}
      className={className}
    >
      <span className="text-base leading-none">{driver.code}</span>
      {isFastestLap && (
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-purple-600/80">
          {fastestLapLabel}
        </span>
      )}
    </Link>
  );
};

function SprintResultsPage(): JSX.Element {
  const { t } = useTranslation();
  const { round } = useParams({ from: "/sprint/$round" });
  const { selectedSeason } = useSelectedSeason();
  const {
    data: sprintResultsData,
    isLoading,
    error,
  } = useSprintResults(round, selectedSeason, { throwOnError: false }) as {
    data: SprintResult[] | null | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const results = useMemo<SprintResult[]>(
    () => sprintResultsData ?? [],
    [sprintResultsData]
  );
  const fastestLapDriver = useMemo(
    () => getFastestLapDriver(results),
    [results]
  );

  useEffect(() => {
    if (error) {
      console.error("Error fetching sprint results:", error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <SprintResultsPageSkeleton
        round={round}
        selectedSeason={selectedSeason}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t("sprintResults.error", { message: error.message })}
        icon="⚠️"
      />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title={t("sprintResults.empty.title")}
        message={t("sprintResults.empty.message", {
          round,
          season: selectedSeason,
        })}
      />
    );
  }

  const headerClass =
    "px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-white/80 first:rounded-tl-3xl last:rounded-tr-3xl";
  const numericHeaderClass = `${headerClass} text-center`;
  const cellClass = "px-4 py-4 align-middle";
  const numericCellClass = `${cellClass} text-center tabular-nums`;

  return (
    <div className="mx-auto w-[min(100%-2rem,80rem)] rounded-lg bg-(--background-color) py-8">
      <h1 className="mb-5 text-center text-[2vmax] text-(--text-color)">
        {t("sprintResults.heading", { round, season: selectedSeason })}
      </h1>
      <section className="overflow-hidden rounded-3xl border border-(--button-background) bg-(--background-color) shadow-xl shadow-black/10">
        <div className="flex flex-col gap-3 bg-linear-to-r from-[#101018] via-[#1b1b28] to-[#e10600] px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/65">
              {t("sprintResults.summary.eyebrow")}
            </p>
            <h2 className="text-xl font-bold">
              {t("sprintResults.summary.heading")}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
            <p className="rounded-full border border-white/25 bg-white/10 px-4 py-1 text-sm font-bold backdrop-blur">
              {t("sprintResults.summary.entriesListed", {
                count: results.length,
              })}
            </p>
            {fastestLapDriver && (
              <p className="rounded-full border border-purple-300/30 bg-purple-500/20 px-4 py-1 text-sm font-bold text-white backdrop-blur">
                {t("sprintResults.summary.fastestLap", {
                  driver: fastestLapDriver.Driver.code,
                })}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-separate border-spacing-0 text-sm text-(--text-color) transition-all duration-300 ease-in-out md:text-base">
            <caption className="sr-only">
              {t("sprintResults.table.caption", {
                round,
                season: selectedSeason,
              })}
            </caption>
            <thead className="bg-[#15151e] text-white">
              <tr>
                <th className={numericHeaderClass}>
                  {t("sprintResults.table.columns.position")}
                </th>
                <th className={headerClass}>
                  {t("sprintResults.table.columns.driver")}
                </th>
                <th className={headerClass}>
                  {t("sprintResults.table.columns.time")}
                </th>
                <th className={numericHeaderClass}>
                  {t("sprintResults.table.columns.points")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--background-buttons)">
              {results.map((result, index) => {
                const isFastestLap =
                  result.Driver.driverId === fastestLapDriver?.Driver.driverId;
                const medal = getPositionMedal(result.position);

                return (
                  <tr
                    key={result.position}
                    className={`group transition-all duration-200 ease-in-out hover:bg-(--background-buttons) ${
                      isFastestLap
                        ? "bg-purple-500/10"
                        : "odd:bg-(--background-color) even:bg-(--background-color2)"
                    }`}
                  >
                    <td className={numericCellClass}>
                      <span
                        className={`inline-flex min-w-14 items-center justify-center gap-1 rounded-full border px-3 py-1 text-sm font-bold ${getPositionAccentClass(
                          result.position
                        )}`}
                      >
                        {medal && <span aria-hidden="true">{medal}</span>}
                        <span>{result.position}</span>
                      </span>
                    </td>
                    <td className={cellClass}>
                      <div className="flex min-w-0 items-center gap-3">
                        {renderDriverName(
                          result.Driver,
                          isFastestLap,
                          selectedSeason,
                          t("sprintResults.fastestLapBadge")
                        )}
                      </div>
                    </td>
                    <td className={cellClass}>
                      <span className="inline-flex rounded-full bg-(--background-buttons) px-3 py-1 font-semibold tabular-nums text-(--text-color)">
                        {getSprintTimeValue(
                          result,
                          index,
                          t("sprintResults.notAvailable")
                        )}
                      </span>
                    </td>
                    <td className={numericCellClass}>
                      <span className="inline-flex items-baseline justify-center gap-1 rounded-full bg-[#e10600]/10 px-3 py-1 font-bold text-[#e10600]">
                        <span>{result.points}</span>
                        <span className="text-[0.65rem] uppercase tracking-[0.12em]">
                          {t("sprintResults.pointsAbbreviation")}
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
    </div>
  );
}

export default SprintResultsPage;
export type { SprintResult, SprintResultDriver, FastestLap, LapTime };
