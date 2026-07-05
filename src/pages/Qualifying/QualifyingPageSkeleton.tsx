import { useTranslation } from "react-i18next";

interface QualifyingPageSkeletonProps {
  selectedSeason: string;
}

const surfaceClass =
  "border border-[rgba(196,32,33,0.16)] bg-(--navbar-background) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const chartCardClass =
  "rounded-[1.75rem] border border-(--background-color2) bg-(--background-buttons) p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] min-[900px]:p-6";
const skeletonBlockClass =
  "animate-pulse motion-reduce:animate-none rounded-[1.25rem] bg-(--background-color2) opacity-70";

function QualifyingSkeletonBlock({
  className,
}: {
  className: string;
}): JSX.Element {
  return (
    <div aria-hidden="true" className={`${skeletonBlockClass} ${className}`} />
  );
}

function QualifyingPageSkeleton({
  selectedSeason,
}: QualifyingPageSkeletonProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="mx-auto w-[min(100%-2rem,80rem)] py-8"
      data-testid="qualifying-page-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">
        {t("qualifying.loading", { season: selectedSeason })}
      </span>

      <section
        className={`${surfaceClass} overflow-hidden rounded-[28px]`}
        aria-hidden="true"
      >
        <div className="relative p-[clamp(1.25rem,4vw,2.5rem)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <QualifyingSkeletonBlock className="h-3 w-34 rounded-full" />
              <QualifyingSkeletonBlock className="h-12 w-[clamp(15rem,42vw,24rem)] rounded-[1.6rem]" />
              <QualifyingSkeletonBlock className="h-4 w-full max-w-2xl rounded-full" />
              <QualifyingSkeletonBlock className="h-4 w-5/6 max-w-xl rounded-full" />
            </div>

            <div className="grid min-w-[min(100%,18rem)] grid-cols-2 gap-3 rounded-3xl bg-(--background-buttons) p-3 max-[480px]:grid-cols-1">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="rounded-2xl bg-(--background-color) p-4">
                  <QualifyingSkeletonBlock className="h-3 w-18 rounded-full" />
                  <QualifyingSkeletonBlock className="mt-3 h-8 w-20 rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${chartCardClass} mt-6`} aria-hidden="true">
        <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
          <div className="space-y-3">
            <QualifyingSkeletonBlock className="h-3 w-28 rounded-full" />
            <QualifyingSkeletonBlock className="h-8 w-52 rounded-2xl" />
          </div>
          <div className="w-full max-w-xl space-y-2">
            <QualifyingSkeletonBlock className="h-3 w-full rounded-full" />
            <QualifyingSkeletonBlock className="h-3 w-5/6 rounded-full" />
          </div>
        </div>

        <div className="grid gap-3 min-[720px]:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-2xl bg-(--background-color) p-4">
              <QualifyingSkeletonBlock className="h-3 w-22 rounded-full" />
              <QualifyingSkeletonBlock className="mt-3 h-7 w-28 rounded-2xl" />
              <QualifyingSkeletonBlock className="mt-2 h-3 w-24 rounded-full" />
            </div>
          ))}
        </div>

        <QualifyingSkeletonBlock className="mt-4 h-96 w-full rounded-3xl" />

        <div className="mt-4 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
          <QualifyingSkeletonBlock className="h-3 w-28 rounded-full" />
          <div className="mt-4 grid gap-3 min-[640px]:grid-cols-2 min-[980px]:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <QualifyingSkeletonBlock className="h-3 w-16 rounded-full" />
                <QualifyingSkeletonBlock className="h-5 w-26 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6" aria-hidden="true">
        <div className="mb-4 flex items-center justify-between gap-4 max-[700px]:flex-col max-[700px]:items-stretch">
          <div className="space-y-3">
            <QualifyingSkeletonBlock className="h-8 w-48 rounded-2xl" />
            <QualifyingSkeletonBlock className="h-3 w-64 rounded-full" />
          </div>
          <QualifyingSkeletonBlock className="h-12 w-52 rounded-full max-[700px]:w-full" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <article
              key={index}
              className={`${surfaceClass} overflow-hidden rounded-3xl p-5`}
            >
              <div className="flex items-start justify-between gap-3">
                <QualifyingSkeletonBlock className="h-8 w-20 rounded-full" />
                <QualifyingSkeletonBlock className="h-4 w-24 rounded-full" />
              </div>

              <div className="mt-5 space-y-3">
                <QualifyingSkeletonBlock className="h-7 w-3/4 rounded-2xl" />
                <QualifyingSkeletonBlock className="h-4 w-1/2 rounded-full" />
              </div>

              <div className="mt-8 border-t border-(--background-buttons-hover) pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <QualifyingSkeletonBlock className="h-4 w-5/6 rounded-full" />
                    <QualifyingSkeletonBlock className="h-4 w-2/3 rounded-full" />
                  </div>
                  <QualifyingSkeletonBlock className="h-5 w-18 rounded-full" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default QualifyingPageSkeleton;