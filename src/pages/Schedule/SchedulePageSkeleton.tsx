import { useTranslation } from "react-i18next";

interface SchedulePageSkeletonProps {
  selectedSeason: string;
}

const skeletonBlockClass =
  "animate-pulse motion-reduce:animate-none rounded-[1.25rem] bg-(--background-color2) opacity-70";

function ScheduleSkeletonBlock({
  className,
}: {
  className: string;
}): JSX.Element {
  return <div aria-hidden="true" className={`${skeletonBlockClass} ${className}`} />;
}

function SchedulePageSkeleton({
  selectedSeason,
}: SchedulePageSkeletonProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="font-(--f1r) bg-(--background-color) px-4 py-8 text-(--text-color) sm:px-6 lg:px-10"
      data-testid="schedule-page-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">
        {t("calendar.loading", { season: selectedSeason })}
      </span>

      <div className="mx-auto max-w-7xl" aria-hidden="true">
        <div className="space-y-4">
          <ScheduleSkeletonBlock className="h-3 w-42 rounded-full" />
          <ScheduleSkeletonBlock className="h-11 w-[min(100%,26rem)] rounded-[1.6rem]" />
          <ScheduleSkeletonBlock className="h-4 w-full max-w-3xl rounded-full" />
          <ScheduleSkeletonBlock className="h-4 w-5/6 max-w-2xl rounded-full" />
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={`schedule-summary-skeleton-${index}`}
              className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm"
            >
              <ScheduleSkeletonBlock className="h-3 w-24 rounded-full" />
              <ScheduleSkeletonBlock className="mt-3 h-8 w-28 rounded-2xl" />
            </div>
          ))}
        </section>
      </div>

      <div className="mx-auto mt-10 max-w-7xl space-y-8" aria-hidden="true">
        {Array.from({ length: 2 }, (_, monthIndex) => (
          <section key={`schedule-month-skeleton-${monthIndex}`}>
            <div className="mb-4 flex items-center gap-4">
              <ScheduleSkeletonBlock className="h-8 w-36 rounded-2xl" />
              <span className="h-px flex-1 bg-(--background-color2)" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, raceIndex) => (
                <article
                  key={`schedule-race-skeleton-${monthIndex}-${raceIndex}`}
                  className="grid h-full grid-cols-[5rem_1fr] overflow-hidden rounded-2xl border border-(--background-color2) bg-(--background-color) shadow-sm"
                >
                  <div className="flex flex-col items-center justify-center gap-3 bg-(--background-buttons) px-3 py-5">
                    <ScheduleSkeletonBlock className="h-3 w-10 rounded-full" />
                    <ScheduleSkeletonBlock className="h-10 w-10 rounded-2xl" />
                  </div>

                  <div className="flex min-h-56 flex-col gap-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <ScheduleSkeletonBlock className="h-7 w-20 rounded-full" />
                      <ScheduleSkeletonBlock className="h-7 w-24 rounded-full" />
                    </div>

                    <div className="space-y-3">
                      <ScheduleSkeletonBlock className="h-7 w-4/5 rounded-2xl" />
                      <ScheduleSkeletonBlock className="h-4 w-3/5 rounded-full" />
                    </div>

                    <ScheduleSkeletonBlock className="mt-auto h-4 w-2/3 rounded-full" />
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-(--background-color2) bg-(--background-buttons)/60 px-5 py-4">
                    <ScheduleSkeletonBlock className="mr-auto h-9 w-28 rounded-full" />
                    <ScheduleSkeletonBlock className="h-3 w-24 rounded-full" />
                    <ScheduleSkeletonBlock className="h-9 w-22 rounded-full" />
                    <ScheduleSkeletonBlock className="h-9 w-28 rounded-full" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="flex flex-col items-center gap-3 pt-2">
          <ScheduleSkeletonBlock className="h-4 w-44 rounded-full" />
          <ScheduleSkeletonBlock className="h-11 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default SchedulePageSkeleton;