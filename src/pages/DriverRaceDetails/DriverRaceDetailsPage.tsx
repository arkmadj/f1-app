import { useEffect, useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import {
  useCurrentSeasonRaces,
  useRacePitStops,
  useRaceResults,
} from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import type {
  ErgastDriver,
  ErgastRace,
  PitStop,
  RaceResult,
} from "../../services/api/racesApi";

const getDriverLabel = (driver: ErgastDriver): string => {
  if (driver.code) return driver.code;
  return (
    [driver.givenName, driver.familyName].filter(Boolean).join(" ") ||
    driver.driverId
  );
};

const getDriverFullName = (driver: ErgastDriver): string =>
  [driver.givenName, driver.familyName].filter(Boolean).join(" ");

const formatRaceDate = (
  date: string | undefined,
  language: string,
  t: TFunction
): string => {
  if (!date) return t("driverRaceDetails.dateTbc");
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
};

const getRaceLocation = (raceInfo?: ErgastRace): string => {
  const location = raceInfo?.Circuit.Location;
  return [location?.locality, location?.country].filter(Boolean).join(", ");
};

const sortPitStops = (pitStops: readonly PitStop[]): PitStop[] =>
  [...pitStops].sort((a, b) => {
    const stopDifference = Number(a.stop ?? 0) - Number(b.stop ?? 0);
    if (stopDifference !== 0) return stopDifference;
    return Number(a.lap ?? 0) - Number(b.lap ?? 0);
  });

const getFastestPitStop = (pitStops: readonly PitStop[]): PitStop | undefined =>
  pitStops.reduce<PitStop | undefined>((fastest, pitStop) => {
    const duration = Number.parseFloat(pitStop.duration ?? "");
    if (Number.isNaN(duration)) return fastest;
    if (!fastest) return pitStop;
    return duration < Number.parseFloat(fastest.duration ?? "")
      ? pitStop
      : fastest;
  }, undefined);

const formatCompoundName = (compound: string, t: TFunction): string => {
  const normalizedCompound = compound
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (normalizedCompound.includes("soft")) {
    return t("driverRaceDetails.compounds.soft");
  }
  if (normalizedCompound.includes("medium")) {
    return t("driverRaceDetails.compounds.medium");
  }
  if (normalizedCompound.includes("hard")) {
    return t("driverRaceDetails.compounds.hard");
  }
  if (normalizedCompound.includes("intermediate")) {
    return t("driverRaceDetails.compounds.intermediate");
  }
  if (normalizedCompound.includes("wet")) {
    return t("driverRaceDetails.compounds.wet");
  }

  return compound
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
};

const getPitStopCompound = (pitStop: PitStop, t: TFunction): string | null => {
  const compound =
    pitStop.compound ??
    pitStop.tireCompound ??
    pitStop.tyreCompound ??
    pitStop.tire?.compound ??
    pitStop.tyre?.compound;

  return compound ? formatCompoundName(compound, t) : null;
};

const getCompoundSummary = (
  pitStops: readonly PitStop[],
  t: TFunction
): string => {
  const compounds = pitStops
    .map((pitStop) => getPitStopCompound(pitStop, t))
    .filter((compound): compound is string => Boolean(compound));

  return compounds.length > 0
    ? compounds.join(" → ")
    : t("driverRaceDetails.strategy.compoundDataUnavailable");
};

type TireStrategyStint = {
  id: string;
  label: string;
  compound: string;
  startLap?: number;
  endLap?: number;
  lapCount: number | null;
};

const parseLapNumber = (lap?: string): number | null => {
  const value = Number.parseInt(lap ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const getLapCount = (startLap?: number, endLap?: number): number | null => {
  if (!startLap || !endLap) return null;
  return Math.max(endLap - startLap + 1, 0);
};

const formatLapCount = (lapCount: number | null, t: TFunction): string => {
  if (lapCount === null) return t("driverRaceDetails.strategy.lapCountTbc");
  return t("driverRaceDetails.strategy.lapCount", { count: lapCount });
};

const formatLapRange = (stint: TireStrategyStint, t: TFunction): string => {
  if (!stint.startLap || !stint.endLap) {
    return t("driverRaceDetails.strategy.lapRangeTbc");
  }
  if (stint.startLap === stint.endLap) {
    return t("driverRaceDetails.strategy.singleLap", { lap: stint.startLap });
  }
  return t("driverRaceDetails.strategy.lapRange", {
    end: stint.endLap,
    start: stint.startLap,
  });
};

const getTireStrategyStints = (
  pitStops: readonly PitStop[],
  completedLaps: string | undefined,
  t: TFunction
): TireStrategyStint[] => {
  const raceLapCount = parseLapNumber(completedLaps);

  if (pitStops.length === 0) {
    return raceLapCount
      ? [
          {
            id: "single-stint",
            label: t("driverRaceDetails.strategy.stintLabel", { number: 1 }),
            compound: t("driverRaceDetails.strategy.compoundTbc"),
            startLap: 1,
            endLap: raceLapCount,
            lapCount: raceLapCount,
          },
        ]
      : [];
  }

  const orderedPitStops = sortPitStops(pitStops);
  const firstStopLap = parseLapNumber(orderedPitStops[0]?.lap);
  const stints: TireStrategyStint[] = [
    {
      id: "opening-stint",
      label: t("driverRaceDetails.strategy.openingStint"),
      compound: t("driverRaceDetails.strategy.compoundTbc"),
      startLap: 1,
      endLap: firstStopLap ?? undefined,
      lapCount: firstStopLap,
    },
  ];

  orderedPitStops.forEach((pitStop, index) => {
    const stopLap = parseLapNumber(pitStop.lap);
    const nextStopLap = parseLapNumber(orderedPitStops[index + 1]?.lap);
    const startLap = stopLap ? stopLap + 1 : undefined;
    const endLap = nextStopLap ?? raceLapCount ?? undefined;

    stints.push({
      id: `stint-${pitStop.stop ?? index + 2}-${pitStop.lap ?? "unknown"}`,
      label: t("driverRaceDetails.strategy.stintLabel", { number: index + 2 }),
      compound:
        getPitStopCompound(pitStop, t) ??
        t("driverRaceDetails.strategy.compoundTbc"),
      startLap,
      endLap,
      lapCount: getLapCount(startLap, endLap),
    });
  });

  return stints;
};

const getCompoundAccentClass = (compound: string): string => {
  const normalizedCompound = compound.toLowerCase();

  if (
    normalizedCompound.includes("soft") ||
    normalizedCompound.includes("blando")
  ) {
    return "border-red-500/70 bg-red-500/20 text-red-700";
  }
  if (
    normalizedCompound.includes("medium") ||
    normalizedCompound.includes("medio")
  ) {
    return "border-yellow-400/80 bg-yellow-400/25 text-yellow-800";
  }
  if (
    normalizedCompound.includes("hard") ||
    normalizedCompound.includes("duro")
  ) {
    return "border-slate-300 bg-slate-100 text-slate-900";
  }
  if (
    normalizedCompound.includes("intermediate") ||
    normalizedCompound.includes("intermedio")
  ) {
    return "border-emerald-500/70 bg-emerald-500/20 text-emerald-700";
  }
  if (
    normalizedCompound.includes("wet") ||
    normalizedCompound.includes("lluvia")
  ) {
    return "border-blue-500/70 bg-blue-500/20 text-blue-700";
  }

  return "border-(--background-buttons-hover) bg-(--background-buttons) text-(--text-color)";
};

const StatCard = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) => (
  <div className="rounded-2xl border border-(--button-background) bg-(--background-color) p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.2em] text-(--text-color2)">
      {label}
    </p>
    <p className="mt-2 text-xl font-bold text-(--text-color)">{value}</p>
    {detail && <p className="mt-1 text-sm text-(--text-color2)">{detail}</p>}
  </div>
);

const TireStrategyTimeline = ({
  stints,
  t,
}: {
  stints: readonly TireStrategyStint[];
  t: TFunction;
}) => {
  if (stints.length === 0) {
    return (
      <p className="mt-3 text-sm text-(--text-color2)">
        {t("driverRaceDetails.strategy.unavailable")}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div
        aria-label={t("driverRaceDetails.strategy.timelineAriaLabel")}
        className="flex flex-wrap gap-2"
        role="list"
      >
        {stints.map((stint) => (
          <div
            aria-label={t("driverRaceDetails.strategy.stintAriaLabel", {
              compound: stint.compound,
              lapCount: formatLapCount(stint.lapCount, t),
              label: stint.label,
            })}
            className={`min-w-32 rounded-2xl border px-3 py-3 shadow-sm ${getCompoundAccentClass(
              stint.compound
            )}`}
            key={stint.id}
            role="listitem"
            style={{ flexBasis: 0, flexGrow: stint.lapCount ?? 1 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-75">
              {stint.label}
            </p>
            <p className="mt-1 text-lg font-bold">{stint.compound}</p>
            <p className="mt-1 text-sm font-semibold">
              {formatLapCount(stint.lapCount, t)}
            </p>
          </div>
        ))}
      </div>

      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {stints.map((stint) => (
          <li
            className="rounded-xl bg-(--background-color) px-4 py-3 text-sm"
            key={`${stint.id}-details`}
          >
            <span className="font-bold">{stint.label}</span> · {stint.compound}
            <br />
            <span className="text-(--text-color2)">
              {formatLapRange(stint, t)} · {formatLapCount(stint.lapCount, t)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

function DriverRaceDetailsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { race, driver } = useParams({ from: "/race/$race/driver/$driver" });
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const { data: seasonRacesData } = useCurrentSeasonRaces(selectedSeason) as {
    data: ErgastRace[] | undefined;
  };
  const {
    data: raceResultsData,
    isLoading,
    error,
  } = useRaceResults(race, selectedSeason) as {
    data: RaceResult[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  const { data: pitStopsData } = useRacePitStops(race, selectedSeason) as {
    data: PitStop[] | undefined;
  };

  const result = useMemo(
    () => raceResultsData?.find((entry) => entry.Driver.driverId === driver),
    [driver, raceResultsData]
  );
  const raceInfo = useMemo(
    () => seasonRacesData?.find((entry) => entry.round === race),
    [race, seasonRacesData]
  );
  const driverPitStops = useMemo(
    () =>
      sortPitStops(
        (pitStopsData ?? []).filter((pitStop) => pitStop.driverId === driver)
      ),
    [driver, pitStopsData]
  );
  const fastestPitStop = useMemo(
    () => getFastestPitStop(driverPitStops),
    [driverPitStops]
  );

  useEffect(() => {
    if (error) console.error("Error fetching driver race details:", error);
  }, [error]);

  useEffect(() => {
    document.title = t("driverRaceDetails.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  if (isLoading) return <Loader label={t("driverRaceDetails.loading")} />;

  if (error) {
    return (
      <div className="mt-5 text-center text-[1.2em] text-[#dc3545]">
        {t("driverRaceDetails.error")}
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title={t("driverRaceDetails.empty.title")}
        message={t("driverRaceDetails.empty.message", {
          round: race,
          season: selectedSeason,
        })}
        action={
          <Link
            to="/race/$race"
            params={{ race }}
            search={seasonSearchParams(selectedSeason)}
          >
            {t("driverRaceDetails.backToRaceResults")}
          </Link>
        }
      />
    );
  }

  const driverName =
    getDriverFullName(result.Driver) || getDriverLabel(result.Driver);
  const raceTitle =
    raceInfo?.raceName ??
    result.raceName ??
    t("driverRaceDetails.roundLabel", { round: race, season: selectedSeason });
  const raceLocation = getRaceLocation(raceInfo);
  const finishTime =
    result.Time?.time ?? result.status ?? t("driverRaceDetails.statusTbc");
  const pitStrategy =
    driverPitStops.length > 0
      ? t("driverRaceDetails.pitStops.count", {
          count: driverPitStops.length,
        })
      : t("driverRaceDetails.pitStops.noStops");
  const compoundSummary = getCompoundSummary(driverPitStops, t);
  const tireStrategyStints = getTireStrategyStints(
    driverPitStops,
    result.laps,
    t
  );

  return (
    <main className="mx-auto max-w-6xl rounded-lg bg-(--background-color) px-4 pb-8 text-(--text-color)">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/race/$race"
          params={{ race }}
          search={seasonSearchParams(selectedSeason)}
          className="rounded-full bg-(--background-buttons) px-4 py-2 font-bold"
        >
          {t("driverRaceDetails.backToRaceResultsWithArrow")}
        </Link>
        <Link
          to="/driver/$id"
          params={{ id: driver }}
          search={seasonSearchParams(selectedSeason)}
          className="rounded-full bg-[#e10600] px-4 py-2 font-bold text-white"
        >
          {t("driverRaceDetails.driverProfile")}
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border border-(--button-background) shadow-xl shadow-black/10">
        <div className="bg-linear-to-r from-[#15151e] via-[#1f1f2b] to-[#e10600] px-6 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70">
            {t("driverRaceDetails.eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{driverName}</h1>
          <p className="mt-2 text-white/80">
            {raceTitle} ·{" "}
            {t("driverRaceDetails.roundLabel", {
              round: race,
              season: selectedSeason,
            })}
          </p>
        </div>

        <div className="grid gap-4 bg-(--button-background) p-5 md:grid-cols-3">
          <StatCard
            label={t("driverRaceDetails.stats.finish")}
            value={`P${result.position}`}
            detail={
              result.positionText
                ? t("driverRaceDetails.classified", {
                    positionText: result.positionText,
                  })
                : finishTime
            }
          />
          <StatCard
            label={t("driverRaceDetails.stats.constructor")}
            value={
              result.Constructor?.name ?? t("driverRaceDetails.constructorTbc")
            }
            detail={result.Constructor?.nationality}
          />
          <StatCard
            label={t("driverRaceDetails.stats.points")}
            value={t("driverRaceDetails.pointsValue", {
              points: result.points,
            })}
            detail={t("driverRaceDetails.lapsCompleted", {
              laps: result.laps ?? "—",
            })}
          />
          <StatCard
            label={t("driverRaceDetails.stats.grid")}
            value={
              result.grid ? `P${result.grid}` : t("driverRaceDetails.gridTbc")
            }
            detail={t("driverRaceDetails.startingPosition")}
          />
          <StatCard
            label={t("driverRaceDetails.stats.fastestLap")}
            value={
              result.FastestLap?.Time?.time ??
              t("driverRaceDetails.fastestLapNotRecorded")
            }
            detail={
              result.FastestLap?.lap
                ? t("driverRaceDetails.lapDetail", {
                    lap: result.FastestLap.lap,
                  })
                : undefined
            }
          />
          <StatCard
            label={t("driverRaceDetails.stats.pitStrategy")}
            value={pitStrategy}
            detail={
              fastestPitStop?.duration
                ? t("driverRaceDetails.pitStops.bestStop", {
                    duration: fastestPitStop.duration,
                  })
                : t("driverRaceDetails.pitStops.dataUnavailable")
            }
          />
          <StatCard
            label={t("driverRaceDetails.stats.tireCompounds")}
            value={compoundSummary}
            detail={t("driverRaceDetails.compoundsFitted")}
          />
        </div>
      </section>

      <section
        aria-label={t("driverRaceDetails.strategy.ariaLabel")}
        className="mt-6 rounded-2xl bg-(--button-background) p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {t("driverRaceDetails.strategy.heading")}
            </h2>
            <p className="mt-1 text-sm text-(--text-color2)">
              {t("driverRaceDetails.strategy.description")}
            </p>
          </div>
          <span className="rounded-full bg-(--background-buttons) px-3 py-1 text-sm font-semibold">
            {pitStrategy}
          </span>
        </div>
        <TireStrategyTimeline stints={tireStrategyStints} t={t} />
      </section>

      <section
        aria-label={t("driverRaceDetails.context.ariaLabel")}
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        <div className="rounded-2xl bg-(--button-background) p-5">
          <h2 className="text-lg font-bold">
            {t("driverRaceDetails.context.heading")}
          </h2>
          <p className="mt-3 text-sm text-(--text-color2)">
            {formatRaceDate(raceInfo?.date ?? result.date, currentLanguage, t)}
          </p>
          <p className="mt-1 text-sm text-(--text-color2)">
            {raceInfo?.Circuit.circuitName ??
              t("driverRaceDetails.context.circuitTbc")}
            {raceLocation ? ` · ${raceLocation}` : ""}
          </p>
          <p className="mt-3 rounded-full bg-(--background-buttons) px-3 py-1 text-sm font-semibold">
            {t("driverRaceDetails.context.statusLabel", { status: finishTime })}
          </p>
        </div>

        <div className="rounded-2xl bg-(--button-background) p-5">
          <h2 className="text-lg font-bold">
            {t("driverRaceDetails.pitStops.heading")}
          </h2>
          {driverPitStops.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {driverPitStops.map((pitStop) => (
                <li
                  key={`${pitStop.stop}-${pitStop.lap}`}
                  className="rounded-xl bg-(--background-color) px-4 py-3 text-sm"
                >
                  {t("driverRaceDetails.pitStops.details", {
                    compound:
                      getPitStopCompound(pitStop, t) ??
                      t("driverRaceDetails.strategy.compoundTbc"),
                    duration: pitStop.duration
                      ? t("driverRaceDetails.pitStops.duration", {
                          duration: pitStop.duration,
                        })
                      : t("driverRaceDetails.pitStops.durationTbc"),
                    lap: pitStop.lap ?? "—",
                    stop: pitStop.stop ?? "—",
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-(--text-color2)">
              {t("driverRaceDetails.pitStops.empty")}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default DriverRaceDetailsPage;
