import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

// Stub every routed page/component so the tests stay focused on the router's
// own responsibilities (banner + route wiring) and do not pull in heavy
// children that perform network requests, load
// fonts, etc.
vi.mock("./pages/LandingPage/LandingPage", () => ({
  default: () => <div data-testid="page-landing" />,
}));
vi.mock("./pages/DriverStandings/DriverStandings", () => ({
  default: () => <div data-testid="page-driver-standings" />,
}));
vi.mock("./pages/SeasonLeaders/SeasonLeaders", () => ({
  default: () => <div data-testid="page-season-leaders" />,
}));
vi.mock("./pages/DriverComparison/DriverComparison", () => ({
  default: () => <div data-testid="page-driver-comparison" />,
}));
vi.mock("./pages/ConstructorComparison/ConstructorComparison", () => ({
  default: () => <div data-testid="page-constructor-comparison" />,
}));
vi.mock("./pages/ConstructorStandings/ConstructorStandings", () => ({
  default: () => <div data-testid="page-constructor-standings" />,
}));
vi.mock("./pages/Schedule/Schedule", () => ({
  default: () => <div data-testid="page-schedule" />,
}));
vi.mock("./pages/DriverProfile/DriverProfile", () => ({
  default: () => <div data-testid="page-driver-profile" />,
}));
vi.mock("./pages/ConstructorProfile/ConstructorsProfile", () => ({
  default: () => <div data-testid="page-constructors-profile" />,
}));
vi.mock("./pages/Races/RacesPage", () => ({
  default: () => <div data-testid="page-races" />,
}));
vi.mock("./pages/RaceResults/RaceResultsPage", () => ({
  default: () => <div data-testid="page-race-results" />,
}));
vi.mock("./pages/DriverRaceDetails/DriverRaceDetailsPage", () => ({
  default: () => <div data-testid="page-driver-race-details" />,
}));
vi.mock("./pages/SprintResults/SprintResultPage", () => ({
  default: () => <div data-testid="page-sprint-results" />,
}));
vi.mock("./pages/QualifyingResults/QualifyingResults", () => ({
  default: () => <div data-testid="page-qualifying-results" />,
}));
vi.mock("./pages/Qualifying/QualifyingPage", () => ({
  default: () => <div data-testid="page-qualifying" />,
}));
vi.mock("./components/NavBar/NavBar", () => ({
  default: () => <div data-testid="navbar" />,
}));
vi.mock("./components/Footer/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));
vi.mock("./components/SplashScreen/SplashScreen", () => ({
  default: () => null,
}));

const { routeTree } = await import("./app/router");

const renderAt = async (path) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
};

describe("App", () => {
  it("renders the multi-season banner", async () => {
    await renderAt("/");
    expect(
      screen.getByText(/multi-season mode is available/i)
    ).toBeInTheDocument();
  });

  it("keeps the season banner visible across routes", async () => {
    await renderAt("/driverstandings");
    expect(
      screen.getByText(/multi-season mode is available/i)
    ).toBeInTheDocument();
  });

  it.each([
    ["/", "page-landing"],
    ["/driverstandings", "page-driver-standings"],
    ["/season-leaders", "page-season-leaders"],
    ["/driver-comparison", "page-driver-comparison"],
    ["/constructorstandings", "page-constructor-standings"],
    ["/constructor-comparison", "page-constructor-comparison"],
    ["/schedule", "page-schedule"],
    ["/qualifying", "page-qualifying"],
    ["/race", "page-races"],
    ["/race/monaco", "page-race-results"],
    ["/race/5/driver/max_verstappen", "page-driver-race-details"],
    ["/sprint/5", "page-sprint-results"],
    ["/qualifying/5", "page-qualifying-results"],
    ["/driver/max_verstappen", "page-driver-profile"],
    ["/constructor/red_bull", "page-constructors-profile"],
    ["/race/3?season=2023", "page-race-results"],
  ])("routes %s to the matching page", async (path, testId) => {
    await renderAt(path);
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it("renders the 404 page for unknown routes", async () => {
    await renderAt("/this-route-does-not-exist");
    expect(
      screen.getByRole("heading", { name: /404 — this lap went off track/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(
      screen.getByRole("link", { name: /driver standings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /constructor standings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /race results/i })
    ).toBeInTheDocument();
  });
});
