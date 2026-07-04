import { useTranslation } from "react-i18next";

interface SprintResultsPageSkeletonProps {
  round: string;
  selectedSeason: string;
}

const skeletonBlockClass =
  "animate-pulse motion-reduce:animate-none rounded-[1.25rem] bg-(--background-color2) opacity-70";

function SkeletonBlock({ className }: { className: string }): JSX.Element {
  return <div aria-hidden="true" className={`${skeletonBlockClass} ${className}`} />;
}

function SprintResultsPageSkeleton({
  round,
  selectedSeason,
}: SprintResultsPageSkeletonProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="mx-auto max-w-full min-w-25 rounded-lg bg-(--background-color) pb-1.25"
      data-testid="sprint-results-page-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">
        {t("sprintResults.loading", { round, season: selectedSeason })}
      </span>

      <div className="mb-5 flex justify-center" aria-hidden="true">
        <SkeletonBlock className="h-10 w-[min(100%,30rem)] rounded-[1.7rem]" />
      </div>

      <section
        className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-(--button-background) bg-(--background-color) shadow-xl shadow-black/10"
        aria-hidden="true"
      >
        <div className="flex flex-col gap-3 bg-linear-to-r from-[#101018] via-[#1b1b28] to-[#e10600] px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-32 rounded-full bg-white/20" />
            <SkeletonBlock className="h-8 w-44 rounded-2xl bg-white/25" />
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
            <SkeletonBlock className="h-9 w-34 rounded-full bg-white/20" />
            <SkeletonBlock className="h-9 w-40 rounded-full bg-white/20" />
          </div>
        </div>

        <div className="overflow-x-auto p-4 sm:p-5">
          <div className="min-w-160 space-y-3">
            <div className="grid grid-cols-[0.7fr_1.4fr_1fr_0.8fr] gap-4 px-4 pb-2">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonBlock
                  key={`sprint-results-header-skeleton-${index}`}
                  className="h-3 w-20 rounded-full"
                />
              ))}
            </div>

            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`sprint-results-row-skeleton-${index}`}
                className="grid grid-cols-[0.7fr_1.4fr_1fr_0.8fr] items-center gap-4 rounded-[1.1rem] border border-(--button-background) bg-(--background-color) px-4 py-4"
              >
                <SkeletonBlock className="h-8 w-14 rounded-full" />
                <SkeletonBlock className="h-10 w-36 rounded-2xl" />
                <SkeletonBlock className="h-8 w-28 rounded-full" />
                <SkeletonBlock className="h-8 w-18 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default SprintResultsPageSkeleton;