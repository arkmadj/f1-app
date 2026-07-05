import { useTranslation } from "react-i18next";

const surfaceClass =
  "border border-[rgba(196,32,33,0.16)] bg-(--navbar-background) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const skeletonBlockClass =
  "animate-pulse motion-reduce:animate-none rounded-[1.25rem] bg-(--background-color2) opacity-70";

function SkeletonBlock({ className }: { className: string }): JSX.Element {
  return <div aria-hidden="true" className={`${skeletonBlockClass} ${className}`} />;
}

function QualifyingResultsPageSkeleton(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="mx-auto w-[min(100%-2rem,80rem)] py-8"
      data-testid="qualifying-results-page-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{t("qualifyingResults.loading")}</span>

      <section
        className={`${surfaceClass} flex items-center justify-between gap-6 rounded-3xl p-[clamp(1.25rem,4vw,2rem)] max-[760px]:flex-col max-[760px]:items-start`}
        aria-hidden="true"
      >
        <div className="w-full max-w-3xl space-y-3">
          <SkeletonBlock className="h-3 w-40 rounded-full" />
          <SkeletonBlock className="h-13 w-[clamp(15rem,40vw,24rem)] rounded-[1.7rem]" />
          <SkeletonBlock className="h-4 w-full max-w-2xl rounded-full" />
          <SkeletonBlock className="h-4 w-5/6 max-w-xl rounded-full" />
        </div>
        <SkeletonBlock className="h-12 w-48 rounded-full max-[760px]:w-full" />
      </section>

      <section
        className="my-4 grid grid-cols-3 gap-4 max-[760px]:grid-cols-1"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`qualifying-results-summary-skeleton-${index}`}
            className={`${surfaceClass} rounded-[18px] p-4`}
          >
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-8 w-34 rounded-2xl" />
          </div>
        ))}
      </section>

      <section
        className={`${surfaceClass} mb-4 rounded-[22px] p-6 max-[600px]:px-4`}
        aria-hidden="true"
      >
        <div className="flex items-start justify-between gap-4 max-[760px]:flex-col">
          <div className="w-full max-w-3xl space-y-3">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="h-8 w-64 rounded-2xl" />
            <SkeletonBlock className="h-4 w-full rounded-full" />
            <SkeletonBlock className="h-4 w-5/6 max-w-2xl rounded-full" />
          </div>
          <SkeletonBlock className="h-10 w-36 rounded-full" />
        </div>

        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={`qualifying-results-timeline-skeleton-${index}`}
              className="relative pl-6"
            >
              {index < 2 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[0.34rem] top-8 bottom-[-1rem] w-px bg-(--button-background)"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="absolute left-0 top-5 h-3 w-3 rounded-full bg-(--background-color2)"
              />

              <article className="rounded-3xl border border-(--button-background) bg-(--background-color) p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <SkeletonBlock className="h-3 w-30 rounded-full" />
                    <SkeletonBlock className="h-7 w-3/4 rounded-2xl" />
                    <SkeletonBlock className="h-4 w-full rounded-full" />
                    <SkeletonBlock className="h-4 w-5/6 rounded-full" />
                  </div>
                  <div className="rounded-2xl bg-(--background-buttons) px-4 py-3 lg:min-w-44">
                    <SkeletonBlock className="h-3 w-18 rounded-full" />
                    <SkeletonBlock className="mt-2 h-7 w-24 rounded-2xl" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SkeletonBlock className="h-9 w-32 rounded-full" />
                  <SkeletonBlock className="h-9 w-28 rounded-full" />
                  <SkeletonBlock className="h-9 w-40 rounded-full" />
                </div>
              </article>
            </div>
          ))}
        </div>
      </section>

      <section
        className={`${surfaceClass} overflow-hidden rounded-[22px]`}
        aria-hidden="true"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 max-[600px]:flex-col max-[600px]:px-4">
          <div className="w-full max-w-3xl space-y-3">
            <SkeletonBlock className="h-8 w-56 rounded-2xl" />
            <SkeletonBlock className="h-4 w-full rounded-full" />
            <SkeletonBlock className="h-4 w-3/4 rounded-full" />
          </div>
          <SkeletonBlock className="h-11 w-36 rounded-full max-[600px]:w-full" />
        </div>

        <div className="overflow-x-auto p-5 max-[600px]:px-4">
          <div className="min-w-[980px] space-y-3">
            <div className="grid grid-cols-[0.55fr_1.4fr_1.2fr_0.9fr_0.9fr_0.9fr_1.1fr] gap-3 px-4 pb-2">
              {Array.from({ length: 7 }, (_, index) => (
                <SkeletonBlock
                  key={`qualifying-results-table-header-skeleton-${index}`}
                  className="h-3 w-20 rounded-full"
                />
              ))}
            </div>

            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`qualifying-results-table-row-skeleton-${index}`}
                className="grid grid-cols-[0.55fr_1.4fr_1.2fr_0.9fr_0.9fr_0.9fr_1.1fr] gap-3 rounded-[1.1rem] bg-(--background-color) px-4 py-4"
              >
                <SkeletonBlock className="h-8 w-11 rounded-full" />
                <SkeletonBlock className="h-8 w-11/12 rounded-2xl" />
                <SkeletonBlock className="h-8 w-10/12 rounded-2xl" />
                <SkeletonBlock className="h-8 w-full rounded-2xl" />
                <SkeletonBlock className="h-8 w-full rounded-2xl" />
                <SkeletonBlock className="h-8 w-full rounded-2xl" />
                <SkeletonBlock className="h-8 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default QualifyingResultsPageSkeleton;