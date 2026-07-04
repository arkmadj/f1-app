import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test-utils/router";

// Mock the static asset lookup modules so each conditional branch in
// ConstructorsProfile can be exercised without bundling real images.
vi.mock("../../domain/f1/driversImage", () => ({
  getDriverImage: vi.fn((driverId, variant) => {
    if (driverId === "max_verstappen" && variant === "profile") {
      return "ver-portrait.png";
    }
    return undefined;
  }),
}));
vi.mock("../../domain/f1/teamLogo", () => {
  const logos: Record<string, string> = { "Red Bull": "redbull-logo.png" };

  return {
    default: logos,
    getTeamLogo: (teamName: string) => logos[teamName],
  };
});
vi.mock("../../domain/f1/teamCars", () => {
  const cars: Record<string, string> = { "Red Bull": "redbull-car.png" };

  return {
    default: cars,
    getTeamCar: (teamName: string) => cars[teamName],
    isTeamName: (teamName: string) => teamName in cars,
  };
});

vi.mock("../../components/Loader/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));

const faviconMock = vi.fn();
vi.mock("../../hooks/useFavicon", () => ({
  default: (href) => faviconMock(href),
}));

const useDriversByConstructorMock = vi.fn();
const useConstructorMock = vi.fn();
const useDriverStandingsTimelineMock = vi.fn();
const useConstructorRaceResultsMock = vi.fn();
const useConstructorCrossSeasonGalleryMock = vi.fn();
vi.mock("../../hooks/queries", () => ({
  useDriversByConstructor: (...args) => useDriversByConstructorMock(...args),
  useConstructor: (...args) => useConstructorMock(...args),
  useDriverStandingsTimeline: (...args) =>
    useDriverStandingsTimelineMock(...args),
  useConstructorRaceResults: (...args) =>
    useConstructorRaceResultsMock(...args),
  useConstructorCrossSeasonGallery: (...args) =>
    useConstructorCrossSeasonGalleryMock(...args),
}));

import ConstructorsProfile from "./ConstructorsProfile";

const RED_BULL_CONSTRUCTOR = {
  constructorId: "red_bull",
  name: "Red Bull",
  nationality: "Austrian",
  url: "https://en.wikipedia.org/wiki/Red_Bull_Racing",
};

const buildConstructorResponse = (constructors = [RED_BULL_CONSTRUCTOR]) => ({
  MRData: {
    ConstructorTable: {
      Constructors: constructors,
    },
  },
});

const VERSTAPPEN = {
  position: "1",
  points: "575",
  wins: "19",
  Driver: {
    driverId: "max_verstappen",
    permanentNumber: "1",
    code: "VER",
    givenName: "Max",
    familyName: "Verstappen",
    nationality: "Dutch",
  },
  Constructors: [RED_BULL_CONSTRUCTOR],
};

const PEREZ = {
  position: "8",
  points: "152",
  wins: "0",
  Driver: {
    driverId: "perez",
    permanentNumber: "11",
    code: "PER",
    givenName: "Sergio",
    familyName: "Perez",
    nationality: "Mexican",
  },
  Constructors: [RED_BULL_CONSTRUCTOR],
};

// Bearman is unconditionally filtered out; include him to assert that.
const BEARMAN = {
  position: "20",
  points: "7",
  wins: "1",
  Driver: {
    driverId: "bearman",
    givenName: "Oliver",
    familyName: "Bearman",
    nationality: "British",
  },
  Constructors: [RED_BULL_CONSTRUCTOR],
};

const DRIVER_TIMELINE = [
  {
    season: "2024",
    round: "1",
    raceName: "Bahrain Grand Prix",
    date: "2024-03-02",
    DriverStandings: [
      { ...VERSTAPPEN, position: "1", points: "25" },
      { ...PEREZ, position: "2", points: "18" },
      { ...BEARMAN, position: "18", points: "0" },
    ],
  },
  {
    season: "2024",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    date: "2024-03-09",
    DriverStandings: [
      { ...VERSTAPPEN, position: "1", points: "51" },
      { ...PEREZ, position: "2", points: "36" },
      { ...BEARMAN, position: "17", points: "0" },
    ],
  },
];

const CONSTRUCTOR_RACE_RESULTS = [
  {
    position: "1",
    points: "25",
    Driver: VERSTAPPEN.Driver,
    Constructor: RED_BULL_CONSTRUCTOR,
  },
  {
    position: "2",
    points: "18",
    Driver: PEREZ.Driver,
    Constructor: RED_BULL_CONSTRUCTOR,
  },
  {
    position: "1",
    points: "25",
    Driver: VERSTAPPEN.Driver,
    Constructor: RED_BULL_CONSTRUCTOR,
  },
  {
    position: "3",
    points: "15",
    Driver: PEREZ.Driver,
    Constructor: RED_BULL_CONSTRUCTOR,
  },
];

const CROSS_SEASON_GALLERY = [
  {
    season: "2024",
    standing: {
      position: "1",
      points: "727",
      wins: "19",
      Constructor: RED_BULL_CONSTRUCTOR,
    },
  },
  {
    season: "2023",
    standing: {
      position: "1",
      points: "860",
      wins: "21",
      Constructor: RED_BULL_CONSTRUCTOR,
    },
  },
  {
    season: "2022",
    standing: {
      position: "1",
      points: "759",
      wins: "17",
      Constructor: RED_BULL_CONSTRUCTOR,
    },
  },
];

const renderAtConstructor = async (constructorId) =>
  renderWithRouter({
    initialPath: `/constructor/${constructorId}`,
    routes: [
      { path: "/constructor/$id", element: <ConstructorsProfile /> },
      {
        path: "/constructorstandings",
        element: <div data-testid="standings-page" />,
      },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
  });

describe("ConstructorsProfile", () => {
  beforeEach(() => {
    useDriversByConstructorMock.mockReset();
    useConstructorMock.mockReset();
    useDriverStandingsTimelineMock.mockReset();
    useConstructorRaceResultsMock.mockReset();
    useConstructorCrossSeasonGalleryMock.mockReset();
    faviconMock.mockReset();
    document.title = "";

    useConstructorMock.mockImplementation((constructorId) => ({
      data: buildConstructorResponse(
        constructorId === "red_bull" ? [RED_BULL_CONSTRUCTOR] : []
      ),
      isLoading: false,
      error: null,
    }));
    useDriverStandingsTimelineMock.mockReturnValue({
      data: DRIVER_TIMELINE,
      isLoading: false,
      error: null,
    });
    useConstructorRaceResultsMock.mockReturnValue({
      data: CONSTRUCTOR_RACE_RESULTS,
      isLoading: false,
      error: null,
    });
    useConstructorCrossSeasonGalleryMock.mockReturnValue({
      data: CROSS_SEASON_GALLERY,
      seasons: ["2024", "2023", "2022"],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Loader while the drivers query is pending", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.queryByText(/Total Points/i)).not.toBeInTheDocument();
  });

  it("renders the error message when the drivers query fails", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("network down"),
    });

    await renderAtConstructor("red_bull");

    expect(screen.getByText("Error: network down")).toBeInTheDocument();
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
  });

  it("keeps constructor details visible when the query returns no drivers", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", { level: 1, name: "Red Bull" })
    ).toBeInTheDocument();
    expect(screen.getByText("No classified drivers")).toBeInTheDocument();
  });

  it("keeps constructor details visible when the data is undefined and not loading", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(screen.getByText("No classified drivers")).toBeInTheDocument();
  });

  it("keeps constructor details visible when bearman is the only driver returned", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [BEARMAN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(screen.getByText("No classified drivers")).toBeInTheDocument();
    expect(screen.queryByText("Oliver Bearman")).not.toBeInTheDocument();
  });

  it("renders the empty-state when the resolved team id does not match", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    // /constructor/ferrari does not match VERSTAPPEN.Constructors entries.
    await renderAtConstructor("ferrari");

    expect(screen.getByText("No team data available")).toBeInTheDocument();
  });

  it("renders the team name as the page heading", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", { level: 1, name: "Red Bull" })
    ).toBeInTheDocument();
  });

  it("renders constructor metadata and external profile link", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(screen.getAllByText("Austrian").length).toBeGreaterThan(0);
    expect(screen.getByText("red_bull")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Red Bull logo" })).toHaveAttribute(
      "src",
      "redbull-logo.png"
    );
    expect(
      screen.getByRole("link", { name: "View constructor history" })
    ).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Red_Bull_Racing");
  });

  it("renders a season livery gallery with cross-season car cards", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", { level: 2, name: "Season livery gallery" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Red Bull 2024 livery" })
    ).toHaveAttribute("src", "redbull-car.png");
    expect(
      screen.getByRole("img", { name: "Red Bull 2023 livery" })
    ).toHaveAttribute("src", "redbull-car.png");
    expect(screen.getAllByText("Selected")).toHaveLength(1);
    expect(screen.getByText("860")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("renders one card per driver excluding bearman", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ, BEARMAN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    const driverLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/driver/"));

    expect(driverLinks).toHaveLength(2);
    expect(driverLinks[0]).toHaveTextContent("Max Verstappen");
    expect(driverLinks[1]).toHaveTextContent("Sergio Perez");
    expect(screen.queryByText("Oliver Bearman")).not.toBeInTheDocument();
  });

  it("renders a driver image when one is mapped and omits it otherwise", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    const portrait = screen.getByAltText("max_verstappen");
    expect(portrait).toHaveAttribute("src", "ver-portrait.png");
    expect(screen.queryByAltText("perez")).not.toBeInTheDocument();
  });

  it("links each driver card to the driver profile route", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    const driverLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/driver/"));

    expect(driverLinks[0]).toHaveAttribute("href", "/driver/max_verstappen");
    expect(driverLinks[1]).toHaveAttribute("href", "/driver/perez");
  });

  it("navigates to the driver profile when a card is clicked", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    const maxLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/driver/max_verstappen");

    expect(maxLink).toBeDefined();
    userEvent.click(maxLink as HTMLElement);

    expect(await screen.findByTestId("driver-page")).toBeInTheDocument();
  });

  it("sums the total wins and total points across non-bearman drivers", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ, BEARMAN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    const wins = screen.getByText("Total Wins").parentElement;
    // Verstappen 19 + Perez 0; Bearman's 1 win must be excluded.
    expect(within(wins).getByText("19")).toBeInTheDocument();

    const points = screen.getByText("Total Points").parentElement;
    // 575 + 152 = 727; Bearman's 7 points must be excluded.
    expect(within(points).getByText("727")).toBeInTheDocument();
  });

  it("renders a points contribution chart for each classified driver", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ, BEARMAN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", { level: 2, name: "Points contribution" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Red Bull driver points contribution chart",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("575 pts · 79.1%")).toBeInTheDocument();
    expect(screen.getByText("152 pts · 20.9%")).toBeInTheDocument();
    expect(screen.queryByText(/Oliver Bearman/)).not.toBeInTheDocument();
  });

  it("renders a driver comparison trend chart for classified drivers", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ, BEARMAN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Driver comparison trends",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Red Bull driver performance trends by round",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("R2 · Saudi Arabian Grand Prix")
    ).toBeInTheDocument();
    expect(screen.getByText("P1 · 51 pts")).toBeInTheDocument();
    expect(screen.getByText("P2 · 36 pts")).toBeInTheDocument();
    expect(screen.queryByText("Oliver Bearman")).not.toBeInTheDocument();
  });

  it("renders driver strength radar charts for classified drivers", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ, BEARMAN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", { level: 2, name: "Driver strength radar" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Max Verstappen driver strength radar chart for Red Bull",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Sergio Perez driver strength radar chart for Red Bull",
      })
    ).toBeInTheDocument();

    const verstappenSummary = screen.getByLabelText(
      "Max Verstappen driver strength summary"
    );
    const perezSummary = screen.getByLabelText(
      "Sergio Perez driver strength summary"
    );
    expect(within(verstappenSummary).getByText("95.8")).toBeInTheDocument();
    expect(within(perezSummary).getByText("41")).toBeInTheDocument();
    expect(
      within(verstappenSummary).getByText("Points pace")
    ).toBeInTheDocument();
    expect(
      within(verstappenSummary).getByText("Team share")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Oliver Bearman/)).not.toBeInTheDocument();
  });

  it("renders the average race finish consistency indicator", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN, PEREZ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(
      screen.getByRole("heading", { level: 2, name: "Average race finish" })
    ).toBeInTheDocument();
    expect(screen.getByText("P1.8")).toBeInTheDocument();
    expect(screen.getByText("Dominant consistency")).toBeInTheDocument();
    expect(
      screen.getByText("4 classified finishes counted")
    ).toBeInTheDocument();
  });

  it("treats non-numeric points and wins as zero in the totals", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [
        { ...VERSTAPPEN, points: "not-a-number", wins: "nope" },
        { ...PEREZ, points: "10.5", wins: "2" },
      ],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    const wins = screen.getByText("Total Wins").parentElement;
    expect(within(wins).getByText("2")).toBeInTheDocument();

    const points = screen.getByText("Total Points").parentElement;
    expect(within(points).getByText("10.5")).toBeInTheDocument();

    expect(screen.getByText("0 pts · 0%")).toBeInTheDocument();
    expect(screen.getByText("10.5 pts · 100%")).toBeInTheDocument();
  });

  it("sets document.title to the team name", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(document.title).toBe("Red Bull Constructor Profile");
  });

  it("registers the team logo with useFavicon when one is mapped", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(faviconMock).toHaveBeenCalledWith("redbull-logo.png");
  });

  it("passes the constructor id from the URL to the query hook", async () => {
    useDriversByConstructorMock.mockReturnValue({
      data: [VERSTAPPEN],
      isLoading: false,
      error: null,
    });

    await renderAtConstructor("red_bull");

    expect(useDriversByConstructorMock).toHaveBeenCalledWith(
      "red_bull",
      "2024"
    );
    expect(useConstructorMock).toHaveBeenCalledWith("red_bull", "2024");
    expect(useDriverStandingsTimelineMock).toHaveBeenCalledWith(
      "2024",
      expect.objectContaining({ enabled: true })
    );
    expect(useConstructorRaceResultsMock).toHaveBeenCalledWith(
      "red_bull",
      "2024",
      expect.objectContaining({ enabled: true })
    );
    expect(useConstructorCrossSeasonGalleryMock).toHaveBeenCalledWith(
      "red_bull",
      "2024"
    );
  });
});
