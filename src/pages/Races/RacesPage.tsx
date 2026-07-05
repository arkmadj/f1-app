import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Flag from "react-world-flags";
import countryCode from "../../domain/f1/countryCode";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useCurrentSeasonRaces } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";
import type { ErgastRace } from "../../services/api/racesApi";

// ---------------------------------------------------------------------------
// Sort order for the past-races list. Kept as a string-literal union so the
// toggle button label and sort comparator can both pivot off a single value
// without resorting to booleans whose meaning is opaque at the call-site.
// ---------------------------------------------------------------------------

type SortOrder = "earliest" | "latest";

const INITIAL_RENDER_TIME = Date.now();

const toTimestamp = (race: ErgastRace): number => new Date(race.date).getTime();

const isPastRace = (race: ErgastRace, now: number): boolean =>
  toTimestamp(race) < now;

const sortByDate = (
  races: readonly ErgastRace[],
  order: SortOrder
): ErgastRace[] => {
  const direction = order === "latest" ? -1 : 1;
  return [...races].sort(
    (a, b) => direction * (toTimestamp(a) - toTimestamp(b))
  );
};

const formatRaceDate = (date: string, language: string): string =>
  new Date(date).toLocaleDateString(language);

function RacesPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const { data, isLoading, error } = useCurrentSeasonRaces(selectedSeason, { throwOnError: false });
  const [sortOrder, setSortOrder] = useState<SortOrder>("earliest");
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const sortButtonLabel =
    sortOrder === "earliest"
      ? t("races.sort.latestFirst")
      : t("races.sort.originalOrder");

  useEffect(() => {
    document.title = t("races.metaTitle");
  }, [t]);

  const sortedRaces = useMemo<ErgastRace[]>(() => {
    const races = data ?? [];
    const past = races.filter((race) => isPastRace(race, INITIAL_RENDER_TIME));
    return sortByDate(past, sortOrder);
  }, [data, sortOrder]);

  const listRef = useStaggerFadeIn<HTMLUListElement>({
    selector: "li",
    deps: [sortedRaces.length, sortOrder, selectedSeason],
  });

  const toggleSortOrder = (): void => {
    setSortOrder((current) => (current === "earliest" ? "latest" : "earliest"));
  };

  return (
    <div className="mx-auto w-[min(100%-2rem,80rem)] py-8">
      <h1 className="text-center mb-5 text-[2em] text-(--text-color)">
        {t("races.heading", { season: selectedSeason })}
      </h1>
      {isLoading ? (
        <Loader label={t("races.loading")} />
      ) : error ? (
        <EmptyState
          title={t("races.error", { message: (error as Error).message })}
          icon="⚠️"
        />
      ) : (
        <>
          <button
            className="transition-all duration-300 ease-in-out bg-(--background-color) text-(--text-color) p-3.75 rounded-[10px] border border-(--button-background) hover:cursor-pointer hover:opacity-50"
            onClick={toggleSortOrder}
          >
            {sortButtonLabel}
          </button>
          {sortedRaces.length === 0 ? (
            <EmptyState
              title={t("races.empty.title")}
              message={t("races.empty.message", { season: selectedSeason })}
            />
          ) : (
            <ul className="list-none pt-2.5" ref={listRef}>
              {sortedRaces.map((race, index) => (
                <li
                  key={`${race.round}-${index}`}
                  className="list-none border border-(--button-background) rounded-lg mb-3.75 p-2.5 bg-(--background-color) transition-all duration-300 ease-in-out hover:border-(--color3)"
                >
                  <Link
                    to="/race/$race"
                    params={{ race: String(race.round) }}
                    search={seasonSearchParams(selectedSeason)}
                    className="no-underline text-inherit transition-opacity duration-300 hover:opacity-70"
                  >
                    <div className="flex flex-col items-start">
                      <p className="text-[1.5em] font-bold my-1.25">
                        {race.raceName}
                      </p>
                      <p className="flex items-center gap-2.5 text-base my-0.75 text-(--text-color2)">
                        {formatRaceDate(race.date, currentLanguage)}
                      </p>
                      <p className="flex items-center gap-2.5 text-base my-0.75 text-(--text-color2)">
                        {race.Circuit.Location.locality},{" "}
                        {race.Circuit.Location.country}{" "}
                        <Flag
                          code={countryCode(race.Circuit.Location.country)}
                          className="h-5 [&_img]:w-30 [&_img]:h-30"
                        />
                      </p>
                    </div>
                  </Link>
                  {race.Circuit.circuitId && (
                    <Link
                      to="/circuit/$id"
                      params={{ id: race.Circuit.circuitId }}
                      search={seasonSearchParams(selectedSeason)}
                      aria-label={t("races.circuitProfileAriaLabel", {
                        circuitId: race.Circuit.circuitId,
                      })}
                      className="mt-3 inline-flex rounded-full border border-(--button-background) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-color2) transition-colors duration-300 hover:border-(--color3) hover:text-(--color3)"
                    >
                      {t("races.circuitProfile")}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default RacesPage;
