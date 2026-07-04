import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { favoriteDriversStorageKey } from "../../app/favoriteDrivers";
import { renderWithRouter } from "../../test-utils/router";

// Mock the data-lookup modules so we can drive every conditional branch
// in DriverProfile without depending on the static asset bundles.
vi.mock("../../domain/f1/driversImage", () => ({
  getDriverImage: vi.fn((driverId, variant) => {
    if (driverId === "max_verstappen" && variant === "profile") {
      return "ver-portrait.png";
    }
    return undefined;
  }),
}));
vi.mock("../../domain/f1/permanentNumber", () => ({
  getPermanentNumberImage: vi.fn((num) => {
    if (num === "1" || num === 1) return "ver-number.png";
    return undefined;
  }),
}));
vi.mock("../../domain/f1/images", () => ({
  default: { Dutch: "NL", Monegasque: "MC" },
}));
vi.mock("../../domain/f1/teamLogo", () => {
  const logos: Record<string, string> = { "Red Bull": "redbull-logo.png" };

  return {
    default: logos,
    getTeamLogo: (teamName: string) => logos[teamName],
  };
});
vi.mock("../../domain/f1/helmets", () => ({
  default: { max_verstappen: "ver-helmet.png" },
  getDriverHelmet: vi.fn((driverId) => {
    if (driverId === "max_verstappen") return "ver-helmet.png";
    return undefined;
  }),
}));
vi.mock("../../domain/f1/driversBio", () => ({
  default: { max_verstappen: "Max biography text." },
}));

// useFavicon is exercised by its own tests; here we just want to make sure
// DriverProfile invokes it with the resolved team logo.
const faviconMock = vi.fn();
vi.mock("../../hooks/useFavicon", () => ({
  default: (href) => faviconMock(href),
}));

// Drive the underlying query state per-test without touching the network.
const useDriverStandingsMock = vi.fn();
const useDriverRaceResultsMock = vi.fn();
const useAllQualifyingResultsMock = vi.fn();
const useDriverStandingsTimelineMock = vi.fn();
const useDriverCrossSeasonComparisonMock = vi.fn();
vi.mock("../../hooks/queries", () => ({
  useDriverStandings: (...args) => useDriverStandingsMock(...args),
  useDriverRaceResults: (...args) => useDriverRaceResultsMock(...args),
  useAllQualifyingResults: (...args) => useAllQualifyingResultsMock(...args),
  useDriverStandingsTimeline: (...args) =>
    useDriverStandingsTimelineMock(...args),
  useDriverCrossSeasonComparison: (...args) =>
    useDriverCrossSeasonComparisonMock(...args),
}));

// react-world-flags renders an <img>; mock it to a predictable testable
// element so we can assert on the resolved country code.
vi.mock("react-world-flags", () => ({
  default: ({ code, className }) => (
    <span data-testid="flag" data-code={code} className={className} />
  ),
}));

import DriverProfile from "./DriverProfile";

const VERSTAPPEN = {
  position: "1",
  points: "575",
  wins: "19",
  Driver: {
    driverId: "max_verstappen",
    givenName: "Max",
    familyName: "Verstappen",
    permanentNumber: "1",
    nationality: "Dutch",
    dateOfBirth: "1997-09-30",
  },
  Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
};

const LECLERC = {
  position: "3",
  points: "308",
  wins: "3",
  Driver: {
    driverId: "leclerc",
    givenName: "Charles",
    familyName: "Leclerc",
    // Not present in the permamentNumber mock - exercises the text branch.
    permanentNumber: "16",
    nationality: "Monegasque",
    dateOfBirth: "1997-10-16",
  },
  // Not present in the teamLogo mock - exercises the missing-logo branch.
  Constructors: [{ constructorId: "ferrari", name: "Ferrari" }],
};

const renderAtDriver = async (driverId) =>
  renderWithRouter({
    initialPath: `/driver/${driverId}`,
    routes: [
      { path: "/driver/$id", element: <DriverProfile /> },
      {
        path: "/constructor/$id",
        element: <div data-testid="constructor-page" />,
      },
    ],
  });

describe("DriverProfile", () => {
  beforeEach(() => {
    useDriverStandingsMock.mockReset();
    useDriverRaceResultsMock.mockReset();
    useDriverRaceResultsMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useAllQualifyingResultsMock.mockReset();
    useAllQualifyingResultsMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useDriverStandingsTimelineMock.mockReset();
    useDriverStandingsTimelineMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useDriverCrossSeasonComparisonMock.mockReset();
    useDriverCrossSeasonComparisonMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      seasons: ["2024", "2023", "2022", "2021"],
    });
    faviconMock.mockReset();
    document.title = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders skeleton placeholders while the standings query is pending", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(screen.getByTestId("driver-profile-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/Biography/i)).not.toBeInTheDocument();
  });

  it("renders the error message when the standings query fails", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("network down"),
    });

    await renderAtDriver("max_verstappen");

    expect(screen.getByText("Error: network down")).toBeInTheDocument();
    expect(screen.queryByTestId("driver-profile-skeleton")).not.toBeInTheDocument();
  });

  it("renders an empty-state message when the driver id is not in the standings", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("hamilton");

    expect(screen.getByText("No driver data available")).toBeInTheDocument();
  });

  it("renders an empty-state message when standings is undefined and not loading", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(screen.getByText("No driver data available")).toBeInTheDocument();
  });

  it("renders the driver's name and headline stats", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN, LECLERC],
      isLoading: false,
      error: null,
    });
    useDriverRaceResultsMock.mockReturnValue({
      data: [
        {
          round: "1",
          raceName: "Bahrain Grand Prix",
          position: "2",
          points: "18",
        },
        {
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          position: "1",
          points: "25",
        },
      ],
      isLoading: false,
      error: null,
    });
    useAllQualifyingResultsMock.mockReturnValue({
      data: [
        {
          season: "2024",
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          results: [
            {
              position: "1",
              Driver: { driverId: "max_verstappen" },
            },
          ],
        },
        {
          season: "2024",
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          results: [
            {
              position: "3",
              Driver: { driverId: "max_verstappen" },
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(
      screen.getByRole("heading", { name: "Max Verstappen" })
    ).toBeInTheDocument();

    // Each labelled stat block exposes its value alongside the label.
    const position = screen.getByText("Position").parentElement;
    expect(within(position).getByText("1")).toBeInTheDocument();

    const wins = screen.getByText("Wins").parentElement;
    expect(within(wins).getByText("19")).toBeInTheDocument();

    const points = screen.getByText("Points").parentElement;
    expect(within(points).getByText("575")).toBeInTheDocument();

    const averageFinish = screen.getByText("Avg Finish").parentElement;
    expect(within(averageFinish).getByText("1.5")).toBeInTheDocument();

    const averageQualifying = screen.getByText("Avg Quali").parentElement;
    expect(within(averageQualifying).getByText("2.0")).toBeInTheDocument();

    const bestFinish = screen.getByText("Best Finish").parentElement;
    expect(within(bestFinish).getByText("P1")).toBeInTheDocument();
    expect(
      within(bestFinish).getByText("Saudi Arabian Grand Prix")
    ).toBeInTheDocument();
  });

  it("marks the profile driver as a favorite and persists the selection", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    const favoriteButton = screen.getByRole("button", {
      name: "Mark Max Verstappen as favorite",
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");

    userEvent.click(favoriteButton);

    expect(
      screen.getByRole("button", {
        name: "Remove Max Verstappen from favorite drivers",
      })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      JSON.parse(window.localStorage.getItem(favoriteDriversStorageKey)!)
    ).toEqual(["max_verstappen"]);
  });

  it("restores and removes a persisted favorite driver", async () => {
    window.localStorage.setItem(
      favoriteDriversStorageKey,
      JSON.stringify(["max_verstappen"])
    );
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    const favoriteButton = screen.getByRole("button", {
      name: "Remove Max Verstappen from favorite drivers",
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    userEvent.click(favoriteButton);

    expect(
      screen.getByRole("button", { name: "Mark Max Verstappen as favorite" })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      JSON.parse(window.localStorage.getItem(favoriteDriversStorageKey)!)
    ).toEqual([]);
  });

  it("toggles the driver's season form trend chart between race and qualifying data", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });
    useDriverRaceResultsMock.mockReturnValue({
      data: [
        {
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          position: "1",
          points: "25",
          status: "Finished",
        },
        {
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          position: "2",
          points: "18",
          status: "+7.152",
        },
      ],
      isLoading: false,
      error: null,
    });
    useAllQualifyingResultsMock.mockReturnValue({
      data: [
        {
          season: "2024",
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          results: [
            {
              position: "1",
              Driver: { driverId: "max_verstappen" },
              Q3: "1:29.179",
            },
          ],
        },
        {
          season: "2024",
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          results: [
            {
              position: "4",
              Driver: { driverId: "max_verstappen" },
              Q2: "1:28.731",
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(
      screen.getByRole("heading", { name: "Performance trend" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Max Verstappen race finish trend by round",
      })
    ).toBeInTheDocument();
    const raceToggle = screen.getByRole("button", { name: "Race" });
    const qualifyingToggle = screen.getByRole("button", { name: "Qualifying" });
    expect(raceToggle).toHaveAttribute("aria-pressed", "true");
    expect(qualifyingToggle).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText("R2 · Saudi Arabian Grand Prix")
    ).toBeInTheDocument();
    expect(screen.getByText("Showing Finish position")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Round 2, Saudi Arabian Grand Prix: finished P2, 18 points"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("P2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("P4").length).toBeGreaterThan(0);
    expect(screen.getByText("Best lap: 1:28.731")).toBeInTheDocument();
    expect(screen.getByText("18 pts")).toBeInTheDocument();

    userEvent.click(qualifyingToggle);

    expect(raceToggle).toHaveAttribute("aria-pressed", "false");
    expect(qualifyingToggle).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", {
        name: "Max Verstappen qualifying position trend by round",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Showing Grid pace")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Round 2, Saudi Arabian Grand Prix: qualified P4, finished P2"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(
        "Round 2, Saudi Arabian Grand Prix: finished P2, 18 points"
      )
    ).not.toBeInTheDocument();
  });

  it("renders a statistical radar chart for driver strengths", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [{ ...VERSTAPPEN, points: "55", wins: "1" }],
      isLoading: false,
      error: null,
    });
    useDriverRaceResultsMock.mockReturnValue({
      data: [
        {
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          position: "1",
          points: "25",
          status: "Finished",
        },
        {
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          position: "2",
          points: "18",
          status: "+7.152",
        },
        {
          round: "3",
          raceName: "Australian Grand Prix",
          date: "2024-03-24",
          position: "3",
          points: "12",
          status: "+12.314",
        },
      ],
      isLoading: false,
      error: null,
    });
    useAllQualifyingResultsMock.mockReturnValue({
      data: [
        {
          season: "2024",
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          results: [{ position: "2", Driver: { driverId: "max_verstappen" } }],
        },
        {
          season: "2024",
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          results: [{ position: "2", Driver: { driverId: "max_verstappen" } }],
        },
        {
          season: "2024",
          round: "3",
          raceName: "Australian Grand Prix",
          date: "2024-03-24",
          results: [{ position: "4", Driver: { driverId: "max_verstappen" } }],
        },
      ],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(
      screen.getByRole("heading", { name: "Driver strengths" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Max Verstappen 2024 driver strengths radar chart",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Statistical radar")).toBeInTheDocument();
    expect(screen.getAllByText("Race pace").length).toBeGreaterThan(0);
    expect(screen.getByText("18.3 pts/start")).toBeInTheDocument();
    expect(screen.getByText("+0.7 positions")).toBeInTheDocument();
    expect(screen.getByText(/Strongest:/)).toHaveTextContent("Strongest:");
  });

  it("renders a career timeline with milestones and standings progression", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });
    useDriverRaceResultsMock.mockReturnValue({
      data: [
        {
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          position: "1",
          points: "25",
          status: "Finished",
          Constructor: { name: "Red Bull" },
        },
        {
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          position: "2",
          points: "18",
          status: "+7.152",
          Constructor: { name: "Red Bull" },
        },
      ],
      isLoading: false,
      error: null,
    });
    useDriverStandingsTimelineMock.mockReturnValue({
      data: [
        {
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          DriverStandings: [
            { ...VERSTAPPEN, position: "2", points: "25", wins: "1" },
          ],
        },
        {
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          DriverStandings: [
            { ...VERSTAPPEN, position: "1", points: "43", wins: "1" },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(
      screen.getByRole("heading", { name: "Career timeline" })
    ).toBeInTheDocument();
    expect(screen.getByText("Max Verstappen is born")).toBeInTheDocument();
    expect(
      screen.getByText("Opened 2024 at Bahrain Grand Prix")
    ).toBeInTheDocument();
    expect(
      screen.getByText("First 2024 win at Bahrain Grand Prix")
    ).toBeInTheDocument();
    expect(screen.getByText("Peaked at championship P1")).toBeInTheDocument();
    expect(screen.getByText("Current standing: P1")).toBeInTheDocument();
    expect(
      screen.getByText("Latest: Saudi Arabian Grand Prix", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders a cross-season comparison section with season-over-season analysis", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });
    useDriverCrossSeasonComparisonMock.mockReturnValue({
      data: [
        {
          season: "2024",
          standing: VERSTAPPEN,
          raceResults: [
            {
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2024-03-02",
              position: "1",
              points: "25",
              Constructor: { name: "Red Bull" },
            },
            {
              round: "2",
              raceName: "Saudi Arabian Grand Prix",
              date: "2024-03-09",
              position: "2",
              points: "18",
              Constructor: { name: "Red Bull" },
            },
          ],
          qualifyingResults: [
            {
              season: "2024",
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2024-03-02",
              results: [{ position: "1", Driver: { driverId: "max_verstappen" } }],
            },
            {
              season: "2024",
              round: "2",
              raceName: "Saudi Arabian Grand Prix",
              date: "2024-03-09",
              results: [{ position: "3", Driver: { driverId: "max_verstappen" } }],
            },
          ],
        },
        {
          season: "2023",
          standing: { ...VERSTAPPEN, points: "410", wins: "12", position: "1" },
          raceResults: [
            {
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2023-03-05",
              position: "1",
              points: "25",
              Constructor: { name: "Red Bull" },
            },
            {
              round: "2",
              raceName: "Saudi Arabian Grand Prix",
              date: "2023-03-19",
              position: "4",
              points: "12",
              Constructor: { name: "Red Bull" },
            },
          ],
          qualifyingResults: [
            {
              season: "2023",
              round: "1",
              raceName: "Bahrain Grand Prix",
              date: "2023-03-05",
              results: [{ position: "2", Driver: { driverId: "max_verstappen" } }],
            },
            {
              season: "2023",
              round: "2",
              raceName: "Saudi Arabian Grand Prix",
              date: "2023-03-19",
              results: [{ position: "5", Driver: { driverId: "max_verstappen" } }],
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      seasons: ["2024", "2023"],
    });

    await renderAtDriver("max_verstappen");

    expect(
      screen.getByRole("heading", { name: "Cross-season comparison" })
    ).toBeInTheDocument();
    expect(screen.getByText("Season-over-season analysis")).toBeInTheDocument();
    expect(screen.getByText("Peak season")).toBeInTheDocument();
    expect(screen.getByText("2024 vs 2023")).toBeInTheDocument();
    expect(screen.getByText("Current view")).toBeInTheDocument();
    expect(screen.getByLabelText("2024 season summary")).toHaveTextContent(
      "P1"
    );
    expect(screen.getByLabelText("2024 season summary")).toHaveTextContent(
      "P1.5"
    );
    expect(screen.getByLabelText("2023 season summary")).toHaveTextContent(
      "Best qualifying: P2"
    );
  });

  it("renders the date of birth together with the computed age", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    // Freeze "today" so the age assertion stays stable across runs.
    vi.setSystemTime(new Date("2024-10-01T00:00:00Z"));
    await renderAtDriver("max_verstappen");

    // Born 1997-09-30, "today" 2024-10-01 -> 27.
    expect(screen.getByText("1997-09-30 (27)")).toBeInTheDocument();
  });

  it("decrements the age when the birthday has not yet occurred this year", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [LECLERC],
      isLoading: false,
      error: null,
    });

    vi.setSystemTime(new Date("2024-10-15T00:00:00Z"));
    await renderAtDriver("leclerc");

    // Born 1997-10-16, day-before birthday in 2024 -> 26 (not 27).
    expect(screen.getByText("1997-10-16 (26)")).toBeInTheDocument();
  });

  it("renders the permanent number as an image when one is mapped", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    const numberImg = screen.getByAltText("1");
    expect(numberImg).toHaveAttribute("src", "ver-number.png");
    expect(numberImg).toHaveClass("permanentNumberDriver");
  });

  it("renders the permanent number as text when no image is mapped", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [LECLERC],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("leclerc");

    expect(screen.queryByAltText("16")).not.toBeInTheDocument();
    // The number sits beside the name in the same heading container.
    const heading = screen.getByRole("heading", { name: "Charles Leclerc" });
    expect(heading.parentElement).toHaveTextContent("16");
  });

  it("renders the driver portrait and helmet when assets exist", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(screen.getByAltText("Max Verstappen portrait")).toHaveAttribute(
      "src",
      "ver-portrait.png"
    );
    expect(screen.getByAltText("Max Verstappen helmet")).toHaveAttribute(
      "src",
      "ver-helmet.png"
    );
  });

  it("renders silhouette fallbacks when portrait and helmet assets are missing", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [LECLERC],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("leclerc");

    const portraitFallback = screen.getByRole("img", {
      name: "Charles Leclerc portrait",
    });
    const helmetFallback = screen.getByRole("img", {
      name: "Charles Leclerc helmet",
    });

    expect(portraitFallback.tagName).toBe("DIV");
    expect(portraitFallback.querySelector("svg")).not.toBeNull();
    expect(helmetFallback.tagName).toBe("DIV");
    expect(helmetFallback.querySelector("svg")).not.toBeNull();
  });

  it("renders the team logo linked to the constructor page when mapped", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    const logo = screen.getByAltText("Red Bull");
    expect(logo).toHaveAttribute("src", "redbull-logo.png");
    expect(logo.closest("a")).toHaveAttribute("href", "/constructor/red_bull");
  });

  it("renders the constructor link without a logo when the team is not mapped", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [LECLERC],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("leclerc");

    expect(screen.queryByAltText("Ferrari")).not.toBeInTheDocument();
    // The link is still rendered so users can navigate to the constructor.
    const constructorLink = document.querySelector(
      'a[href="/constructor/ferrari"]'
    );
    expect(constructorLink).not.toBeNull();
  });

  it("navigates to the constructor page when the team logo is clicked", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    userEvent.click(screen.getByAltText("Red Bull"));

    expect(await screen.findByTestId("constructor-page")).toBeInTheDocument();
  });

  it("renders the nationality flag with the resolved country code", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(screen.getByTestId("flag")).toHaveAttribute("data-code", "NL");
  });

  it("renders the biography section, including the body when one is available", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(
      screen.getByRole("heading", { name: "Biography" })
    ).toBeInTheDocument();
    expect(screen.getByText("Max biography text.")).toBeInTheDocument();
  });

  it("renders the biography heading without a body when no bio is mapped", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [LECLERC],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("leclerc");

    expect(
      screen.getByRole("heading", { name: "Biography" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Max biography text.")).not.toBeInTheDocument();
  });

  it("sets document.title to the driver's full name", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(document.title).toBe("Max Verstappen");
  });

  it("registers the team logo with useFavicon when a constructor is present", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("max_verstappen");

    expect(faviconMock).toHaveBeenCalledWith("redbull-logo.png");
  });

  it("calls useFavicon with undefined when the constructor is unknown", async () => {
    useDriverStandingsMock.mockReturnValue({
      data: [LECLERC],
      isLoading: false,
      error: null,
    });

    await renderAtDriver("leclerc");

    expect(faviconMock).toHaveBeenCalledWith(undefined);
  });
});
