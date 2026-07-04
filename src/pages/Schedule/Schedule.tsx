import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import Flag from "react-world-flags";
import EmptyState from "../../components/EmptyState/EmptyState";
import countryCode from "../../domain/f1/countryCode";
import { useCurrentSeasonRaces } from "../../hooks/queries";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";
import SchedulePageSkeleton from "./SchedulePageSkeleton";

// ---------------------------------------------------------------------------
// Ergast / Jolpica race-schedule response shape (subset used by this page)
// ---------------------------------------------------------------------------

export interface ErgastLocation {
  locality: string;
  country: string;
  lat?: string;
  long?: string;
}

export interface ErgastCircuit {
  circuitId: string;
  url?: string;
  circuitName: string;
  Location: ErgastLocation;
}

export interface ErgastRace {
  season: string;
  round: string;
  url?: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: ErgastCircuit;
}

type RaceStatus = "completed" | "next" | "upcoming";

interface CalendarMonth {
  key: string;
  label: string;
  races: ErgastRace[];
}

interface CalendarEventLinks {
  googleUrl: string;
  icsHref: string;
  icsFilename: string;
}

interface RaceVisibilityState {
  key: string;
  count: number;
}

const RACE_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const INITIAL_VISIBLE_RACE_COUNT = 6;
const RACE_LOAD_BATCH_SIZE = 6;

const formatFullRaceDay = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

const formatCompactRaceDay = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  }).format(date);

const formatRaceMonth = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, {
    month: "long",
    year: "numeric",
  }).format(date);

const formatRaceMonthShort = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, { month: "short" }).format(date);

const formatRaceDayNumber = (date: Date, language: string): string =>
  new Intl.NumberFormat(language).format(date.getDate());

const formatRaceClockTime = (date: Date, language: string): string =>
  new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);

const getRaceStartDate = (race: ErgastRace): Date => {
  const fallbackTime = "00:00:00";
  return new Date(`${race.date}T${race.time ?? fallbackTime}`);
};

const formatCalendarDate = (date: Date): string =>
  date.toISOString().slice(0, 10).replace(/-/g, "");

const formatCalendarDateValue = (date: string): string =>
  date.replace(/-/g, "");

const formatCalendarDateTime = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.[0-9]{3}Z$/, "Z");

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const getNextCalendarDateValue = (date: string): string =>
  formatCalendarDate(addDays(new Date(`${date}T00:00:00Z`), 1));

const getRaceLocation = (race: ErgastRace): string =>
  [
    race.Circuit.circuitName,
    race.Circuit.Location.locality,
    race.Circuit.Location.country,
  ]
    .filter(Boolean)
    .join(", ");

const escapeCalendarText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const buildCalendarEventLinks = (
  race: ErgastRace,
  selectedSeason: string,
  t: TFunction,
  language: string
): CalendarEventLinks => {
  const startDate = getRaceStartDate(race);
  const endDate = race.time
    ? new Date(startDate.getTime() + RACE_EVENT_DURATION_MS)
    : addDays(startDate, 1);
  const title = `${race.raceName}`;
  const location = getRaceLocation(race);
  const details = [
    t("calendar.export.detailsIntro", {
      round: race.round,
      season: selectedSeason,
    }),
    race.Circuit.circuitName
      ? t("calendar.export.circuit", { circuit: race.Circuit.circuitName })
      : "",
    race.url ? t("calendar.export.moreInfo", { url: race.url }) : "",
  ]
    .filter(Boolean)
    .join("\n");
  const allDayStartDate = formatCalendarDateValue(race.date);
  const allDayEndDate = getNextCalendarDateValue(race.date);
  const dates = race.time
    ? `${formatCalendarDateTime(startDate)}/${formatCalendarDateTime(endDate)}`
    : `${allDayStartDate}/${allDayEndDate}`;
  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details,
    location,
  });
  const icsDateFields = race.time
    ? [
        `DTSTART:${formatCalendarDateTime(startDate)}`,
        `DTEND:${formatCalendarDateTime(endDate)}`,
      ]
    : [
        `DTSTART;VALUE=DATE:${allDayStartDate}`,
        `DTEND;VALUE=DATE:${allDayEndDate}`,
      ];
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//F1 App//Race Schedule//${language.toUpperCase()}`,
    "BEGIN:VEVENT",
    `UID:f1-${selectedSeason}-round-${race.round}@f1-app`,
    `DTSTAMP:${formatCalendarDateTime(new Date())}`,
    ...icsDateFields,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(details)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    googleUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    icsHref: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
    icsFilename: `${slugify(`${race.raceName}-round-${race.round}`)}.ics`,
  };
};

const groupRacesByMonth = (
  races: ErgastRace[],
  language: string
): CalendarMonth[] => {
  const groups = new Map<string, CalendarMonth>();

  races.forEach((race) => {
    const startDate = getRaceStartDate(race);
    const key = `${startDate.getFullYear()}-${startDate.getMonth()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatRaceMonth(startDate, language),
        races: [],
      });
    }

    groups.get(key)?.races.push(race);
  });

  return Array.from(groups.values());
};

const getRaceStatus = (
  race: ErgastRace,
  now: Date,
  nextRaceRound?: string
): RaceStatus => {
  if (race.round === nextRaceRound) {
    return "next";
  }

  return getRaceStartDate(race).getTime() < now.getTime()
    ? "completed"
    : "upcoming";
};

const getStatusClassName = (status: RaceStatus): string => {
  if (status === "next") {
    return "border-(--color3) bg-(--color3)/15 text-(--color1)";
  }

  if (status === "completed") {
    return "border-(--background-color2) bg-(--background-buttons) text-(--text-color2)";
  }

  return "border-(--color2) bg-(--color2)/10 text-(--color2)";
};

const formatRaceTime = (
  race: ErgastRace,
  language: string,
  t: TFunction
): string =>
  race.time
    ? formatRaceClockTime(getRaceStartDate(race), language)
    : t("calendar.timeTbc");

function Schedule(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const { data, isLoading, error } = useCurrentSeasonRaces(selectedSeason);
  const [raceVisibility, setRaceVisibility] = useState<RaceVisibilityState>({
    key: "",
    count: INITIAL_VISIBLE_RACE_COUNT,
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const races = useMemo<ErgastRace[]>(
    () => (data as ErgastRace[] | undefined) ?? [],
    [data]
  );

  useEffect(() => {
    document.title = t("calendar.metaTitle");
  }, [t]);

  const calendarRaces = useMemo<ErgastRace[]>(
    () =>
      [...races].sort(
        (a, b) => getRaceStartDate(a).getTime() - getRaceStartDate(b).getTime()
      ),
    [races]
  );

  const firstRaceRound = calendarRaces[0]?.round ?? "";
  const lastRaceRound = calendarRaces[calendarRaces.length - 1]?.round ?? "";
  const raceCollectionKey = `${selectedSeason}:${calendarRaces.length}:${firstRaceRound}:${lastRaceRound}`;
  const visibleRaceCount =
    raceVisibility.key === raceCollectionKey
      ? raceVisibility.count
      : INITIAL_VISIBLE_RACE_COUNT;

  const visibleCalendarRaces = useMemo<ErgastRace[]>(
    () => calendarRaces.slice(0, visibleRaceCount),
    [calendarRaces, visibleRaceCount]
  );

  const visibleCalendarMonths = useMemo<CalendarMonth[]>(
    () => groupRacesByMonth(visibleCalendarRaces, currentLanguage),
    [currentLanguage, visibleCalendarRaces]
  );

  const now = useMemo<Date>(() => new Date(), []);

  const nextRace = useMemo<ErgastRace | undefined>(
    () =>
      calendarRaces.find(
        (race) => getRaceStartDate(race).getTime() >= now.getTime()
      ),
    [calendarRaces, now]
  );

  const seasonSpan =
    calendarRaces.length > 0
      ? `${formatCompactRaceDay(getRaceStartDate(calendarRaces[0]), currentLanguage)} – ${formatCompactRaceDay(getRaceStartDate(calendarRaces[calendarRaces.length - 1]), currentLanguage)}`
      : t("calendar.noDates");

  const calendarRef = useStaggerFadeIn<HTMLDivElement>({
    selector: "[data-calendar-card]",
    deps: [visibleCalendarRaces.length, selectedSeason],
  });

  const remainingRaceCount = Math.max(
    calendarRaces.length - visibleCalendarRaces.length,
    0
  );
  const hasMoreRaces = remainingRaceCount > 0;

  const loadMoreRaces = useCallback(() => {
    setRaceVisibility((currentVisibility) => {
      const currentCount =
        currentVisibility.key === raceCollectionKey
          ? currentVisibility.count
          : INITIAL_VISIBLE_RACE_COUNT;

      return {
        key: raceCollectionKey,
        count: Math.min(
          currentCount + RACE_LOAD_BATCH_SIZE,
          calendarRaces.length
        ),
      };
    });
  }, [calendarRaces.length, raceCollectionKey]);

  useEffect(() => {
    if (!hasMoreRaces || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreRaces();
        }
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreRaces, loadMoreRaces, visibleCalendarRaces.length]);

  if (isLoading) {
    return <SchedulePageSkeleton selectedSeason={selectedSeason} />;
  }

  if (error) {
    return (
      <div className="text-(--color1)">
        {t("calendar.error", { message: (error as Error).message })}
      </div>
    );
  }

  return (
    <div className="font-(--f1r) bg-(--background-color) px-4 py-8 text-(--text-color) sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-(--color3)">
          {t("calendar.eyebrow")}
        </p>
        <h1 className="font-['F1_Bold'] text-3xl leading-tight sm:text-4xl">
          {t("calendar.heading", { season: selectedSeason })}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-(--text-color2)">
          {t("calendar.description")}
        </p>

        <section
          className="mt-8 grid gap-4 sm:grid-cols-3"
          aria-label={t("calendar.summaryAriaLabel", { season: selectedSeason })}
        >
          <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
              {t("calendar.summary.rounds")}
            </p>
            <p className="mt-2 font-['F1_Bold'] text-2xl">
              {t("calendar.roundsCount", { count: calendarRaces.length })}
            </p>
          </div>
          <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
              {t("calendar.summary.seasonWindow")}
            </p>
            <p className="mt-2 font-['F1_Bold'] text-2xl">{seasonSpan}</p>
          </div>
          <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
              {t("calendar.summary.nextEvent")}
            </p>
            <p className="mt-2 font-['F1_Bold'] text-2xl">
              {nextRace?.raceName ?? t("calendar.seasonComplete")}
            </p>
          </div>
        </section>
      </div>

      {calendarRaces.length === 0 ? (
        <EmptyState
          title={t("calendar.empty.title")}
          message={t("calendar.empty.message", { season: selectedSeason })}
        />
      ) : (
        <div className="mx-auto mt-10 max-w-7xl space-y-8" ref={calendarRef}>
          {visibleCalendarMonths.map((month) => (
            <section key={month.key} aria-labelledby={`month-${month.key}`}>
              <div className="mb-4 flex items-center gap-4">
                <h2
                  id={`month-${month.key}`}
                  className="font-['F1_Bold'] text-xl text-(--text-color)"
                >
                  {month.label}
                </h2>
                <span className="h-px flex-1 bg-(--background-color2)" />
              </div>

              <ol className="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
                {month.races.map((race) => {
                  const startDate = getRaceStartDate(race);
                  const status = getRaceStatus(race, now, nextRace?.round);
                  const calendarLinks = buildCalendarEventLinks(
                    race,
                    selectedSeason,
                    t,
                    currentLanguage
                  );

                  return (
                    <li key={race.round} data-calendar-card>
                      <article className="grid h-full grid-cols-[5rem_1fr] overflow-hidden rounded-2xl border border-(--background-color2) bg-(--background-color) shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-(--color3) hover:shadow-lg">
                        <Link
                          to="/race/$race"
                          params={{ race: String(race.round) }}
                          search={seasonSearchParams(selectedSeason)}
                          aria-label={t("calendar.raceDetailsAriaLabel", {
                            raceName: race.raceName,
                          })}
                          className="group col-span-2 grid grid-cols-[5rem_1fr] focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
                        >
                          <time
                            dateTime={race.date}
                            className="flex flex-col items-center justify-center bg-(--background-buttons) px-3 py-5 text-center"
                          >
                            <span className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                              {formatRaceMonthShort(startDate, currentLanguage)}
                            </span>
                            <span className="font-['F1_Bold'] text-3xl leading-none text-(--color1)">
                              {formatRaceDayNumber(startDate, currentLanguage)}
                            </span>
                          </time>

                          <div className="flex min-h-56 flex-col gap-4 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="rounded-full border border-(--background-color2) px-3 py-1 text-xs uppercase tracking-[0.16em] text-(--text-color2)">
                                {t("calendar.roundLabel", { round: race.round })}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusClassName(status)}`}
                              >
                                {t(`calendar.status.${status}`)}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-['F1_Bold'] text-xl leading-snug transition-colors duration-300 group-hover:text-(--color3)">
                                {race.raceName}
                              </h3>
                              <p className="mt-2 text-sm text-(--text-color2)">
                                {formatFullRaceDay(startDate, currentLanguage)} ·{" "}
                                {formatRaceTime(race, currentLanguage, t)}
                              </p>
                            </div>

                            <p className="mt-auto flex items-center gap-2 text-sm text-(--text-color2)">
                              <Flag
                                code={countryCode(
                                  race.Circuit.Location.country
                                )}
                                className="h-4 w-6 overflow-hidden rounded-sm shadow-sm"
                              />
                              <span>
                                {race.Circuit.Location.locality},{" "}
                                {race.Circuit.Location.country}
                              </span>
                            </p>
                          </div>
                        </Link>

                        <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-(--background-color2) bg-(--background-buttons)/60 px-5 py-4">
                          {race.Circuit.circuitId && (
                            <Link
                              to="/circuit/$id"
                              params={{ id: race.Circuit.circuitId }}
                              search={seasonSearchParams(selectedSeason)}
                              aria-label={t("calendar.circuitProfileAriaLabel", {
                                circuitName: race.Circuit.circuitName,
                              })}
                              className="mr-auto rounded-full border border-(--background-color2) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-color) transition-colors duration-300 hover:border-(--color3) hover:text-(--color3) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3)"
                            >
                              {t("calendar.circuitProfile")}
                            </Link>
                          )}
                          <span className="text-xs uppercase tracking-[0.16em] text-(--text-color2)">
                            {t("calendar.addToCalendar")}
                          </span>
                          <a
                            href={calendarLinks.googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t("calendar.googleCalendarAriaLabel", {
                              raceName: race.raceName,
                            })}
                            className="rounded-full border border-(--color3) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color1) transition-colors duration-300 hover:bg-(--color3) hover:text-(--background-color) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3)"
                          >
                            Google
                          </a>
                          <a
                            href={calendarLinks.icsHref}
                            download={calendarLinks.icsFilename}
                            type="text/calendar"
                            aria-label={t("calendar.downloadCalendarAriaLabel", {
                              raceName: race.raceName,
                            })}
                            className="rounded-full border border-(--background-color2) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-color) transition-colors duration-300 hover:border-(--color2) hover:text-(--color2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color2)"
                          >
                            Apple / Outlook
                          </a>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}

          {hasMoreRaces && (
            <div
              ref={loadMoreRef}
              className="flex flex-col items-center gap-3 pt-2 text-center"
            >
              <p className="text-sm text-(--text-color2)" aria-live="polite">
                {t("calendar.showingCount", {
                  visible: visibleCalendarRaces.length,
                  total: calendarRaces.length,
                })}
              </p>
              <button
                type="button"
                onClick={loadMoreRaces}
                className="rounded-full border border-(--color3) px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-(--color1) transition-colors duration-300 hover:bg-(--color3) hover:text-(--background-color) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3)"
              >
                {t("calendar.loadMore", {
                  count: Math.min(remainingRaceCount, RACE_LOAD_BATCH_SIZE),
                })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Schedule;
