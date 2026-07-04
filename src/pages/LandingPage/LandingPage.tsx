import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import RaceCountdown from "../../components/RaceCountDown/RaceCountDown";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";

const LazyLastRaceResults = lazy(
  () => import("../../components/LastRaceResults/LastRaceResults")
);
const LazyNewsFeed = lazy(() => import("../../components/NewsFeed/NewsFeed"));

const quickActionCards = [
  {
    to: "/driver-comparison",
    labelKey: "nav.items.compareDrivers",
    descriptionKey: "home.quickActions.compareDriversDescription",
  },
  {
    to: "/constructor-comparison",
    labelKey: "nav.items.compareConstructors",
    descriptionKey: "home.quickActions.compareConstructorsDescription",
  },
  {
    to: "/season-leaders",
    labelKey: "nav.items.seasonLeaders",
    descriptionKey: "home.quickActions.seasonLeadersDescription",
  },
] as const;

const quickActionCardClass =
  "rounded-3xl border border-(--background-color2) bg-(--background-buttons) p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-(--color3) hover:shadow-lg";

const quickActionButtonClass =
  "inline-flex items-center justify-center rounded-full border border-(--color3) px-4 py-2 text-sm font-(--f1b) text-(--color3) transition-colors duration-200 hover:bg-(--color3) hover:text-white";

interface LandingSectionPlaceholderProps {
  label: string;
  minHeightClassName?: string;
}

interface DeferredLandingSectionProps extends LandingSectionPlaceholderProps {
  children: ReactNode;
  rootMargin?: string;
}

function LandingSectionPlaceholder({
  label,
  minHeightClassName = "min-h-[220px]",
}: LandingSectionPlaceholderProps): JSX.Element {
  return (
    <div
      className={`mx-auto my-5 flex w-full max-w-5xl items-center justify-center rounded-3xl border border-dashed border-(--background-color2) px-6 py-8 text-center text-sm text-(--text-color3) ${minHeightClassName}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {label}
    </div>
  );
}

function DeferredLandingSection({
  children,
  label,
  minHeightClassName,
  rootMargin = "320px 0px",
}: DeferredLandingSectionProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState<boolean>(
    () => typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    if (shouldRender) {
      return undefined;
    }

    const containerElement = containerRef.current;
    if (!containerElement || typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(containerElement);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, shouldRender]);

  return (
    <div ref={containerRef} className="w-full">
      {shouldRender ? (
        children
      ) : (
        <LandingSectionPlaceholder
          label={label}
          minHeightClassName={minHeightClassName}
        />
      )}
    </div>
  );
}

function LandingPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const containerRef = useStaggerFadeIn({
    selector: ":scope > *",
    staggerMs: 120,
    duration: 700,
    translateY: 24,
  });

  useEffect(() => {
    document.title = t("home.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  return (
    <div>
      <div
        className="flex flex-col justify-start bg-(--background-color) p-5 text-center"
        ref={containerRef}
      >
        <RaceCountdown />
        <section
          className="mx-auto mt-2 w-full max-w-5xl text-(--text-color)"
          aria-labelledby="landing-quick-actions-title"
        >
          <div className="mb-5 text-left">
            <p className="text-[0.8rem] font-bold tracking-[0.18em] text-(--color1) uppercase">
              {t("home.quickActions.eyebrow")}
            </p>
            <h2 id="landing-quick-actions-title" className="mt-2 text-[1.8rem]">
              {t("home.quickActions.heading")}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActionCards.map(({ to, labelKey, descriptionKey }) => (
              <article key={to} className={quickActionCardClass}>
                <h3 className="text-[1.15rem] font-(--f1b) text-(--text-color)">
                  {t(labelKey)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-(--text-color3)">
                  {t(descriptionKey)}
                </p>
                <Link
                  to={to}
                  search={seasonSearchParams(selectedSeason)}
                  className={`${quickActionButtonClass} mt-4 no-underline`}
                >
                  {t(labelKey)}
                </Link>
              </article>
            ))}
          </div>
        </section>
        <DeferredLandingSection
          label={t("home.lastRaceResults.loading")}
          minHeightClassName="min-h-[360px]"
        >
          <Suspense
            fallback={
              <LandingSectionPlaceholder
                label={t("home.lastRaceResults.loading")}
                minHeightClassName="min-h-[360px]"
              />
            }
          >
            <LazyLastRaceResults />
          </Suspense>
        </DeferredLandingSection>
        <DeferredLandingSection
          label={t("home.newsFeed.loading")}
          minHeightClassName="min-h-[260px]"
        >
          <Suspense
            fallback={
              <LandingSectionPlaceholder
                label={t("home.newsFeed.loading")}
                minHeightClassName="min-h-[260px]"
              />
            }
          >
            <LazyNewsFeed />
          </Suspense>
        </DeferredLandingSection>
      </div>
    </div>
  );
}

export default LandingPage;
