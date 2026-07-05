import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { RaceResult } from "../../services/api/racesApi";
import { getDriverImage } from "../../domain/f1/driversImage";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import { useLastRaceInfo, useLastRaceResults } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import Loader from "../Loader/Loader";
import EmptyState from "../EmptyState/EmptyState";

const resultsGridClass =
  "grid grid-cols-[60px_2fr_1.5fr_1.5fr_80px] items-center gap-3 px-4 py-3 max-[900px]:grid-cols-[48px_2fr_1fr_1fr_64px] max-[900px]:gap-2 max-[900px]:px-3 max-[900px]:py-2.5 max-[600px]:grid-cols-[40px_1fr_50px_60px]";

const getPodiumClasses = (position: number) => {
  const base = {
    item: "relative min-w-35 text-center",
    rank: "mb-2.5 inline-block rounded-full bg-white/10 px-2.5 py-1 text-[0.8em] font-bold tracking-[0.05em] text-white",
    image:
      "h-[110px] w-[110px] rounded-full border-[3px] border-white bg-white/5 object-cover",
  };

  if (position === 1) {
    return {
      item: `${base.item} order-2 -translate-y-3`,
      rank: `${base.rank} bg-[gold] text-[#1a1a1a]`,
      image: `${base.image} h-[130px] w-[130px] border-[gold] shadow-[0_0_0_4px_rgba(255,215,0,0.15)]`,
    };
  }

  if (position === 2) {
    return {
      item: `${base.item} order-1`,
      rank: `${base.rank} bg-[silver] text-[#1a1a1a]`,
      image: `${base.image} border-[silver]`,
    };
  }

  return {
    item: `${base.item} order-3`,
    rank: `${base.rank} bg-[#cd7f32] text-[#1a1a1a]`,
    image: `${base.image} border-[#cd7f32]`,
  };
};

const getPositionLabel = (position: number, t: TFunction): string => {
  if (position === 1) return t("home.lastRaceResults.position.first");
  if (position === 2) return t("home.lastRaceResults.position.second");
  if (position === 3) return t("home.lastRaceResults.position.third");
  return t("home.lastRaceResults.position.other", { position });
};

const getDriverName = (result: RaceResult): string =>
  `${result.Driver.givenName} ${result.Driver.familyName}`;

const getResultTime = (result: RaceResult, t: TFunction): string =>
  result.Time?.time ?? result.status ?? t("home.lastRaceResults.notAvailable");

const formatRaceDate = (date: string, language: string): string =>
  new Date(date).toLocaleDateString(language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function LastRaceResults(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const {
    data: resultsData,
    isLoading: resultsLoading,
    error: resultsError,
  } = useLastRaceResults(selectedSeason, { throwOnError: false });
  const {
    data: raceInfo,
    isLoading: raceInfoLoading,
    error: raceInfoError,
  } = useLastRaceInfo(selectedSeason, { throwOnError: false });

  const results: RaceResult[] = resultsData ?? [];
  const isLoading = resultsLoading || raceInfoLoading;
  const error = resultsError ?? raceInfoError;

  useEffect(() => {
    if (error) {
      console.error("Error fetching last race results:", error);
    }
  }, [error]);

  if (isLoading) {
    return <Loader label={t("home.lastRaceResults.loading")} />;
  }

  if (error) {
    return (
      <EmptyState
        title={t("home.lastRaceResults.error", { message: error.message })}
        icon="⚠️"
      />
    );
  }

  if (results.length === 0 || !raceInfo) {
    return <EmptyState title={t("home.lastRaceResults.empty")} />;
  }

  const topThree = results.slice(0, 3);
  const otherResults = results.slice(3);
  const raceDate = raceInfo.date
    ? formatRaceDate(raceInfo.date, currentLanguage)
    : null;

  return (
    <div className="my-5 text-(--text-color)">
      <header className="mb-12 px-4 text-center">
        <p className="mb-2 text-[0.8em] font-bold tracking-[0.18em] text-(--color1) uppercase">
          {t("home.lastRaceResults.heading", { season: selectedSeason })}
        </p>
        <h2 className="mb-2.5 text-[2.25em] leading-[1.15]">
          {raceInfo.raceName ?? raceInfo.Circuit.circuitName}
        </h2>
        <p className="m-0 text-[0.95em] text-(--text-color3)">
          <span>{raceInfo.Circuit.circuitName}</span>
          {raceInfo.Circuit.Location && (
            <span>
              {" · "}
              {raceInfo.Circuit.Location.locality}
              {", "}
              {raceInfo.Circuit.Location.country}
            </span>
          )}
          {raceDate && (
            <span>
              {" · "}
              {raceDate}
            </span>
          )}
        </p>
      </header>

      <div className="mb-9 flex flex-wrap items-end justify-center gap-6">
        {topThree.map((result, index) => {
          const driverName = getDriverName(result);
          const driverImage = getDriverImage(result.Driver.driverId);
          const podiumClasses = getPodiumClasses(index + 1);

          return (
            <div
              key={`${result.position}-${result.Driver.driverId}`}
              className={podiumClasses.item}
            >
              <Link
                to="/driver/$id"
                params={{ id: result.Driver.driverId }}
                search={seasonSearchParams(selectedSeason)}
                className="block text-inherit no-underline"
              >
                <div className={podiumClasses.rank}>
                  {getPositionLabel(index + 1, t)}
                </div>
                {driverImage && (
                  <img
                    src={driverImage}
                    alt={driverName}
                    className={podiumClasses.image}
                  />
                )}
                <div className="mt-3 flex flex-col gap-0.5">
                  <p className="m-0 text-[1.15em] font-bold">{driverName}</p>
                  <p className="m-0 text-[0.9em] text-(--text-color3) max-[600px]:hidden">
                    {result.Constructor.name}
                  </p>
                  <p className="mt-1 mb-0 text-[0.9em] text-(--text-color2)">
                    {getResultTime(result, t)}
                  </p>
                  <p className="mt-0.5 mb-0 text-[0.95em] font-bold text-(--color1)">
                    {t("home.lastRaceResults.points", { value: result.points })}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <div
        className={`${resultsGridClass} mx-auto w-4/5 border-b border-(--background-color2) pb-2.5 text-[0.75em] tracking-[0.08em] text-(--text-color3) uppercase max-[900px]:w-[95%]`}
        aria-hidden="true"
      >
        <span className="text-center">{t("home.lastRaceResults.columns.position")}</span>
        <span className="col-driver">{t("home.lastRaceResults.columns.driver")}</span>
        <span className="max-[600px]:hidden">{t("home.lastRaceResults.columns.team")}</span>
        <span className="max-[600px]:hidden">
          {t("home.lastRaceResults.columns.timeOrStatus")}
        </span>
        <span className="text-center">{t("home.lastRaceResults.columns.points")}</span>
      </div>

      <ul className="mx-auto w-4/5 list-none p-0 max-[900px]:w-[95%]">
        {otherResults.map((result, index) => {
          const driverName = getDriverName(result);
          const driverImage = getDriverImage(result.Driver.driverId);

          return (
            <Link
              key={`${result.position}-${result.Driver.driverId}`}
              to="/driver/$id"
              params={{ id: result.Driver.driverId }}
              search={seasonSearchParams(selectedSeason)}
              className="group block text-inherit no-underline"
            >
              <li
                className={`${resultsGridClass} my-1.5 rounded-lg border border-transparent ${
                  index % 2 === 0
                    ? "bg-(--background-color)"
                    : "bg-(--background-color2)"
                } transition-all duration-150 group-hover:translate-x-0.5 group-hover:border-[#e10600]/60 group-focus-visible:translate-x-0.5 group-focus-visible:border-[#e10600]/60`}
              >
                <div className="text-center text-[1.05em] font-bold text-(--text-color)">
                  {result.position}
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  {driverImage && (
                    <img
                      src={driverImage}
                      alt={driverName}
                      className="h-11 w-11 shrink-0 rounded-full bg-white/5 object-cover"
                    />
                  )}
                  <span className="truncate font-semibold max-[600px]:text-[0.9em]">
                    {driverName}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2.5 max-[600px]:hidden">
                  <img
                    className="h-auto w-9 shrink-0"
                    src={getTeamLogo(result.Constructor.name)}
                    alt={result.Constructor.name}
                  />
                  <span className="truncate text-[0.95em] text-(--text-color3) max-[900px]:hidden">
                    {result.Constructor.name}
                  </span>
                </div>
                <div className="tabular-nums text-(--text-color2) max-[600px]:hidden">
                  {getResultTime(result, t)}
                </div>
                <div className="text-center font-bold text-(--color1)">
                  {t("home.lastRaceResults.points", { value: result.points })}
                </div>
              </li>
            </Link>
          );
        })}
      </ul>
    </div>
  );
}

export default LastRaceResults;
