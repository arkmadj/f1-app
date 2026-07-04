import { useTranslation } from "react-i18next";

interface ConstructorComparisonPageSkeletonProps {
  selectedSeason: string;
}

const cardBase =
  "rounded-[1.75rem] border border-(--background-color2) bg-(--background-buttons) shadow-[0_18px_45px_rgba(0,0,0,0.08)]";
const skeletonBlockClass =
  "animate-pulse motion-reduce:animate-none rounded-[1.25rem] bg-(--background-color2) opacity-70";

function SkeletonBlock({ className }: { className: string }): JSX.Element {
  return <div aria-hidden="true" className={`${skeletonBlockClass} ${className}`} />;
}

function ConstructorComparisonPageSkeleton({
  selectedSeason,
}: ConstructorComparisonPageSkeletonProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="mx-auto mt-10 w-full max-w-7xl px-3 text-(--text-color) min-[1490px]:px-0"
      data-testid="constructor-comparison-page-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">
        {t("constructorComparison.loading")} · {selectedSeason}
      </span>

      <section
        className="rounded-4xl border border-(--background-color2) bg-[radial-gradient(circle_at_top_left,rgba(196,32,33,0.16),transparent_35%),var(--background-buttons)] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.08)] min-[900px]:p-8"
        aria-hidden="true"
      >
        <SkeletonBlock className="h-3 w-44 rounded-full" />
        <div className="mt-3 grid gap-5 min-[900px]:grid-cols-[1.2fr_0.8fr] min-[900px]:items-end">
          <div className="space-y-4">
            <SkeletonBlock className="h-14 w-[min(100%,28rem)] rounded-[1.8rem]" />
            <SkeletonBlock className="h-4 w-full max-w-3xl rounded-full" />
            <SkeletonBlock className="h-4 w-5/6 max-w-2xl rounded-full" />
          </div>

          <div className="grid gap-3 rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-3">
                <SkeletonBlock className="h-3 w-32 rounded-full" />
                <SkeletonBlock className="h-12 w-full rounded-2xl" />
              </div>
            ))}
          </div>

          <SkeletonBlock className="h-11 w-52 rounded-full" />
        </div>
      </section>

      <section className="mt-6 grid gap-5 min-[1040px]:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 2 }, (_, index) => (
          <article key={index} className={`${cardBase} p-5 min-[900px]:p-6`}>
            <div className="flex items-start gap-4">
              <SkeletonBlock className="h-20 w-20 rounded-3xl" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="h-8 w-44 rounded-2xl" />
                <SkeletonBlock className="h-4 w-32 rounded-full" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 min-[560px]:grid-cols-3">
              {Array.from({ length: 3 }, (_, statIndex) => (
                <div key={statIndex} className="rounded-2xl bg-(--background-color) p-4">
                  <SkeletonBlock className="h-3 w-18 rounded-full" />
                  <SkeletonBlock className="mt-3 h-7 w-24 rounded-2xl" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={`${cardBase} mt-6 p-5 min-[900px]:p-6`} aria-hidden="true">
        <div className="mb-5 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="h-8 w-64 rounded-2xl" />
          </div>
          <div className="w-full max-w-xl space-y-2">
            <SkeletonBlock className="h-3 w-full rounded-full" />
            <SkeletonBlock className="h-3 w-5/6 rounded-full" />
          </div>
        </div>

        <div className="grid gap-3 min-[560px]:grid-cols-2 min-[1160px]:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl bg-(--background-color) p-4">
              <SkeletonBlock className="h-3 w-20 rounded-full" />
              <SkeletonBlock className="mt-3 h-6 w-24 rounded-2xl" />
              <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className={`${cardBase} mt-6 p-5 min-[900px]:p-6`} aria-hidden="true">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-56 rounded-2xl" />
          <SkeletonBlock className="h-4 w-full max-w-xl rounded-full" />
        </div>
        <SkeletonBlock className="mt-6 h-72 w-full rounded-3xl" />
      </section>

      <section className={`${cardBase} mt-6 p-5 min-[900px]:p-6`} aria-hidden="true">
        <div className="mb-5 flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-30 rounded-full" />
            <SkeletonBlock className="h-8 w-64 rounded-2xl" />
          </div>
          <SkeletonBlock className="h-4 w-full max-w-sm rounded-full" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-3xl border border-(--background-color2) bg-(--background-color) p-4">
              <div className="flex items-center justify-between gap-3">
                <SkeletonBlock className="h-4 w-40 rounded-full" />
                <SkeletonBlock className="h-4 w-24 rounded-full" />
              </div>
              <SkeletonBlock className="mt-4 h-3 w-full rounded-full" />
              <SkeletonBlock className="mt-3 h-3 w-5/6 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ConstructorComparisonPageSkeleton;