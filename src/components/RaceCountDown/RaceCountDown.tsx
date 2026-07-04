import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { ErgastRace } from "../../services/api/racesApi";
import { useCurrentSeasonRaces } from "../../hooks/queries";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";

// ---------------------------------------------------------------------------
// Helpers
//
// Pure helpers are kept outside of the component so they can be reasoned
// about (and tested) independently of React state and timers.
// ---------------------------------------------------------------------------

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;
const DEFAULT_RACE_TIME = "00:00:00Z";

const parseRaceStartTime = (race: ErgastRace): Date =>
  new Date(`${race.date}T${race.time ?? DEFAULT_RACE_TIME}`);

const formatLocalSessionTime = (
  race: ErgastRace,
  language: string,
  t: TFunction
): string => {
  const raceStartTime = parseRaceStartTime(race);

  if (!race.time) {
    return `${new Intl.DateTimeFormat(language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(raceStartTime)} · ${t("home.raceCountdown.timeTbd")}`;
  }

  return new Intl.DateTimeFormat(language, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(raceStartTime);
};

const getUserTimeZone = (fallbackLabel: string): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackLabel;

const formatTimeRemaining = (timeDiffMs: number, t: TFunction): string => {
  if (timeDiffMs <= 0) return t("home.raceCountdown.startingNow");

  const days = Math.floor(timeDiffMs / MS_IN_DAY);
  const hours = Math.floor((timeDiffMs % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((timeDiffMs % MS_IN_HOUR) / MS_IN_MINUTE);
  const seconds = Math.floor((timeDiffMs % MS_IN_MINUTE) / MS_IN_SECOND);

  return t("home.raceCountdown.countdown", {
    days,
    hours,
    minutes,
    seconds,
  });
};

const findUpcomingRace = (
  races: ErgastRace[],
  now: Date = new Date()
): ErgastRace | undefined =>
  races.find((race) => parseRaceStartTime(race) > now);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RaceCountdown(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const {
    data: races,
    isLoading,
    isError,
  } = useCurrentSeasonRaces(selectedSeason);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const nextRace = useMemo<ErgastRace | null>(
    () => (races ? (findUpcomingRace(races) ?? null) : null),
    [races]
  );
  const nextRaceStartTime = useMemo<Date | null>(
    () => (nextRace ? parseRaceStartTime(nextRace) : null),
    [nextRace]
  );
  const localSessionTime = useMemo<string>(
    () =>
      nextRace ? formatLocalSessionTime(nextRace, currentLanguage, t) : "",
    [currentLanguage, nextRace, t]
  );
  const userTimeZone = useMemo<string>(
    () => getUserTimeZone(t("home.raceCountdown.timezoneFallback")),
    [currentLanguage, t]
  );

  useEffect(() => {
    if (!nextRaceStartTime) return;

    const tick = (): void => {
      const timeDiff = nextRaceStartTime.getTime() - Date.now();
      setTimeRemaining(formatTimeRemaining(timeDiff, t));
      if (timeDiff <= 0) clearInterval(interval);
    };

    tick();
    const interval: ReturnType<typeof setInterval> = setInterval(
      tick,
      MS_IN_SECOND
    );

    return () => clearInterval(interval);
  }, [currentLanguage, nextRaceStartTime, t]);

  const containerClass =
    "flex justify-center items-center min-h-[27vh] px-4 py-8 bg-(--background-color) text-center";
  const messageClass =
    "font-(--f1r) text-(--text-color2) px-6 py-5 tracking-[0.05em] animate-[rcd-fade-in_0.5s_ease-out_both] motion-reduce:animate-none";

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className={messageClass}>{t("home.raceCountdown.loading")}</div>
      </div>
    );
  }

  if (isError || !nextRace) {
    return (
      <div className={containerClass}>
        <div className={messageClass}>{t("home.raceCountdown.empty")}</div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div
        className={
          "relative flex items-stretch overflow-hidden bg-(--background-color2) rounded-[14px] " +
          "min-w-[min(420px,90vw)] max-w-140 " +
          "shadow-[0_10px_30px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] " +
          "transition-[transform,box-shadow] duration-300 ease-in-out " +
          "hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.16),0_3px_8px_rgba(0,0,0,0.08)] " +
          "animate-[rcd-rise_0.6s_cubic-bezier(0.22,1,0.36,1)_both] " +
          "motion-reduce:animate-none motion-reduce:hover:translate-y-0"
        }
      >
        <span
          aria-hidden="true"
          className="w-1.5 shrink-0 bg-linear-to-b from-(--color1) via-(--color2) to-(--color3)"
        />
        <div className="flex-1 flex flex-col gap-[0.4rem] px-8 py-7">
          <div className="inline-flex items-center justify-center gap-[0.55rem] mb-1">
            <span
              aria-hidden="true"
              className="w-[0.55rem] h-[0.55rem] rounded-full bg-(--color2) animate-[rcd-pulse_1.8s_ease-out_infinite] motion-reduce:animate-none"
            />
            <h2 className="m-0 font-(--f1w,var(--f1r)) text-[clamp(0.8rem,1.6vw,1rem)] tracking-[0.22em] uppercase text-(--color2)">
              {t("home.raceCountdown.heading", { season: selectedSeason })}
            </h2>
          </div>
          <p className="mt-[0.1rem] mb-[0.4rem] mx-0 font-(--f1b,var(--f1r)) text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.15] text-(--text-color)">
            {nextRace.raceName}
          </p>
          <p className="m-0 font-(--f1r) text-[0.78rem] tracking-[0.18em] uppercase text-(--text-color2)">
            {t("home.raceCountdown.localSessionTime", {
              timezone: userTimeZone,
            })}
          </p>
          <time
            dateTime={nextRaceStartTime?.toISOString()}
            className="m-0 font-(--f1r) text-[clamp(0.95rem,2vw,1.1rem)] text-(--text-color2)"
          >
            {localSessionTime}
          </time>
          <p className="m-0 font-(--f1r) tabular-nums text-[clamp(1.1rem,2.4vw,1.5rem)] tracking-[0.08em] text-(--text-color)">
            {timeRemaining}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RaceCountdown;
