/* eslint-disable react-refresh/only-export-components -- route modules export both route objects and small layout components. */
import { lazy, Suspense, useCallback, useState } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import NavBar from "../components/NavBar/NavBar";
import Footer from "../components/Footer/Footer";
import ErrorBoundary from "../components/ErrorBoundary/ErrorBoundary";
import Loader from "../components/Loader/Loader";
import SplashScreen from "../components/SplashScreen/SplashScreen";
import SeasonBanner from "../components/SeasonBanner/SeasonBanner";
import { useSelectedSeason } from "../hooks/useSelectedSeason";
import {
  DEFAULT_SEASON,
  normalizeSeason,
  parseSearchParams,
  seasonSearchParams,
  stringifySearchParams,
} from "../domain/f1/seasons";
import { readAppPreferences } from "./preferences";
import { validateConstructorComparisonSearch } from "../domain/f1/constructorComparisonSearch";
import { validateDriverComparisonSearch } from "../domain/f1/driverComparisonSearch";

import LandingPage from "../pages/LandingPage/LandingPage";
import ConstructorStandings from "../pages/ConstructorStandings/ConstructorStandings";
import NotFound from "../pages/NotFound/NotFound";
import ConstructorComparisonPageSkeleton from "../pages/ConstructorComparison/ConstructorComparisonPageSkeleton";
import QualifyingPageSkeleton from "../pages/Qualifying/QualifyingPageSkeleton";
import SprintResultsPageSkeleton from "../pages/SprintResults/SprintResultsPageSkeleton";

const LazyDriverStandings = lazy(
  () => import("../pages/DriverStandings/DriverStandings")
);
const LazySeasonLeaders = lazy(
  () => import("../pages/SeasonLeaders/SeasonLeaders")
);
const LazySchedule = lazy(() => import("../pages/Schedule/Schedule"));
const LazyDriverProfile = lazy(
  () => import("../pages/DriverProfile/DriverProfile")
);
const LazyDriverComparison = lazy(
  () => import("../pages/DriverComparison/DriverComparison")
);
const LazyConstructorComparison = lazy(
  () => import("../pages/ConstructorComparison/ConstructorComparison")
);
const LazyConstructorsProfile = lazy(
  () => import("../pages/ConstructorProfile/ConstructorsProfile")
);
const LazyCircuitProfile = lazy(
  () => import("../pages/CircuitProfile/CircuitProfile")
);
const LazyRacesPage = lazy(() => import("../pages/Races/RacesPage"));
const LazyRaceResultsPage = lazy(
  () => import("../pages/RaceResults/RaceResultsPage")
);
const LazyDriverRaceDetailsPage = lazy(
  () => import("../pages/DriverRaceDetails/DriverRaceDetailsPage")
);
const LazyQualifyingPage = lazy(
  () => import("../pages/Qualifying/QualifyingPage")
);
const LazyQualifyingResultsPage = lazy(
  () => import("../pages/QualifyingResults/QualifyingResults")
);
const LazySprintResultsPage = lazy(
  () => import("../pages/SprintResults/SprintResultPage")
);

function DriverProfileRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading driver profile" />}>
      <LazyDriverProfile />
    </Suspense>
  );
}

function DriverComparisonRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading driver comparison" />}>
      <LazyDriverComparison />
    </Suspense>
  );
}

function ConstructorComparisonRoute(): JSX.Element {
  const { selectedSeason } = useSelectedSeason();

  return (
    <Suspense
      fallback={
        <ConstructorComparisonPageSkeleton selectedSeason={selectedSeason} />
      }
    >
      <LazyConstructorComparison />
    </Suspense>
  );
}

function DriverStandingsRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading driver standings" />}>
      <LazyDriverStandings />
    </Suspense>
  );
}

function SeasonLeadersRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading season leaders" />}>
      <LazySeasonLeaders />
    </Suspense>
  );
}

function ScheduleRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading schedule" />}>
      <LazySchedule />
    </Suspense>
  );
}

function ConstructorsProfileRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading constructor profile" />}>
      <LazyConstructorsProfile />
    </Suspense>
  );
}

function CircuitProfileRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading circuit profile" />}>
      <LazyCircuitProfile />
    </Suspense>
  );
}

function RacesRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading races" />}>
      <LazyRacesPage />
    </Suspense>
  );
}

function RaceResultsRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading race results" />}>
      <LazyRaceResultsPage />
    </Suspense>
  );
}

function DriverRaceDetailsRoute(): JSX.Element {
  return (
    <Suspense fallback={<Loader label="Loading driver race details" />}>
      <LazyDriverRaceDetailsPage />
    </Suspense>
  );
}

function QualifyingRoute(): JSX.Element {
  const { selectedSeason } = useSelectedSeason();

  return (
    <Suspense fallback={<QualifyingPageSkeleton selectedSeason={selectedSeason} />}>
      <LazyQualifyingPage />
    </Suspense>
  );
}

function QualifyingResultsRoute(): JSX.Element {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<Loader label={t("qualifyingResults.loading")} />}>
      <LazyQualifyingResultsPage />
    </Suspense>
  );
}

function SprintResultsRoute(): JSX.Element {
  const { round } = useParams({ from: "/sprint/$round" });
  const { selectedSeason } = useSelectedSeason();

  return (
    <Suspense
      fallback={
        <SprintResultsPageSkeleton
          round={round}
          selectedSeason={selectedSeason}
        />
      }
    >
      <LazySprintResultsPage />
    </Suspense>
  );
}

function RootLayout(): JSX.Element {
  const [splashDone, setSplashDone] = useState<boolean>(
    () => !readAppPreferences().showSplashScreen
  );
  const onSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <div>
      {!splashDone && <SplashScreen onComplete={onSplashComplete} />}
      <SeasonBanner />
      <ToastContainer />
      <NavBar />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------

interface RootSearch {
  season?: string;
}

const validateRootSearch = (search: Record<string, unknown>): RootSearch => {
  const season = normalizeSeason(search.season ?? DEFAULT_SEASON);
  return seasonSearchParams(season);
};

const rootRoute = createRootRoute({
  validateSearch: validateRootSearch,
  component: RootLayout,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const driverStandingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/driverstandings",
  component: DriverStandingsRoute,
});

const seasonLeadersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/season-leaders",
  component: SeasonLeadersRoute,
});

const driverComparisonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/driver-comparison",
  validateSearch: validateDriverComparisonSearch,
  component: DriverComparisonRoute,
});

const constructorStandingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/constructorstandings",
  component: ConstructorStandings,
});

const constructorComparisonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/constructor-comparison",
  validateSearch: validateConstructorComparisonSearch,
  component: ConstructorComparisonRoute,
});

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule",
  component: ScheduleRoute,
});

const driverProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/driver/$id",
  component: DriverProfileRoute,
});

const constructorProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/constructor/$id",
  component: ConstructorsProfileRoute,
});

const circuitProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/circuit/$id",
  component: CircuitProfileRoute,
});

const racesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/race",
  component: RacesRoute,
});

const raceResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/race/$race",
  component: RaceResultsRoute,
});

const driverRaceDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/race/$race/driver/$driver",
  component: DriverRaceDetailsRoute,
});

const sprintResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sprint/$round",
  component: SprintResultsRoute,
});

const qualifyingIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/qualifying",
  component: QualifyingRoute,
});

const qualifyingResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/qualifying/$round",
  component: QualifyingResultsRoute,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  driverStandingsRoute,
  seasonLeadersRoute,
  driverComparisonRoute,
  constructorStandingsRoute,
  constructorComparisonRoute,
  scheduleRoute,
  driverProfileRoute,
  constructorProfileRoute,
  circuitProfileRoute,
  racesRoute,
  raceResultsRoute,
  driverRaceDetailsRoute,
  sprintResultsRoute,
  qualifyingIndexRoute,
  qualifyingResultsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  parseSearch: parseSearchParams,
  stringifySearch: stringifySearchParams,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
