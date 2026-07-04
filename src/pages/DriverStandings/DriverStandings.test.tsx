import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DriverStandings from "./DriverStandings";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";
import driversService from "../../services/api/testapi";
import {
  getAllRaceResults,
  getAllQualifyingResults,
  getAllSprintResults,
} from "../../services/api/racesApi";

// Replace the API service with a vi-mock so each test can drive the
// useQuery state (loading / success / error) deterministically.
vi.mock("../../services/api/testapi", () => ({
  default: {
    getDriverStandings: vi.fn(),
    getDriverStandingsTimeline: vi.fn(),
  },
}));

vi.mock("../../services/api/racesApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/api/racesApi")>();

  return {
    ...actual,
    getAllRaceResults: vi.fn(),
    getAllSprintResults: vi.fn(),
    getAllQualifyingResults: vi.fn(),
  };
});

// The Loader pulls in react-loader-spinner which renders SVG animations
// we don't care about here; a sentinel keeps the loading-state assertions
// trivial.
vi.mock("../../components/Loader/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));

// react-world-flags loads SVG country assets; stub it so the test stays
// focused on the component's own rendering.
vi.mock("react-world-flags", () => ({
  default: ({ code }) => <span data-testid="flag" data-code={code} />,
}));

// teamLogo imports .webp assets which Vite handles in dev/build but only
// resolve to URLs at test time; stubbing avoids the side-effects of loading
// every team logo and lets us assert on alt text deterministically.
vi.mock("../../domain/f1/teamLogo", () => {
  const logos: Record<string, string> = {
    "Red Bull": "redbull.webp",
    Ferrari: "ferrari.webp",
    // McLaren intentionally omitted to exercise the missing-logo branch.
  };

  return {
    default: logos,
    getTeamLogo: (teamName: string) => logos[teamName],
  };
});

const buildResponse = (driverStandings) => ({
  MRData: {
    StandingsTable: {
      StandingsLists: [
        { season: "2024", round: "10", DriverStandings: driverStandings },
      ],
    },
  },
});

const createObjectURLMock = vi.fn(() => "blob:driver-standings");
const revokeObjectURLMock = vi.fn();
const anchorClickMock = vi.fn();

const sampleDrivers = [
  {
    position: "1",
    points: "300",
    wins: "7",
    Driver: {
      driverId: "max_verstappen",
      givenName: "Max",
      familyName: "Verstappen",
      nationality: "Dutch",
    },
    Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
  },
  {
    position: "2",
    points: "250",
    wins: "4",
    Driver: {
      driverId: "leclerc",
      givenName: "Charles",
      familyName: "Leclerc",
      nationality: "Monegasque",
    },
    Constructors: [{ constructorId: "ferrari", name: "Ferrari" }],
  },
  {
    position: "3",
    points: "200",
    wins: "2",
    Driver: {
      driverId: "norris",
      givenName: "Lando",
      familyName: "Norris",
      nationality: "British",
    },
    Constructors: [{ constructorId: "mclaren", name: "McLaren" }],
  },
];

const sampleTimeline = [
  {
    season: "2024",
    round: "1",
    raceName: "Bahrain Grand Prix",
    date: "2024-03-02",
    DriverStandings: [
      { ...sampleDrivers[1], position: "1", points: "25" },
      { ...sampleDrivers[0], position: "2", points: "18" },
      { ...sampleDrivers[2], position: "3", points: "15" },
    ],
  },
  {
    season: "2024",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    date: "2024-03-09",
    DriverStandings: [
      { ...sampleDrivers[0], position: "1", points: "43" },
      { ...sampleDrivers[1], position: "2", points: "40" },
      { ...sampleDrivers[2], position: "3", points: "27" },
    ],
  },
];

const sampleQualifyingResults = [
  {
    season: "2024",
    round: "1",
    raceName: "Bahrain Grand Prix",
    date: "2024-03-02",
    Circuit: {},
    results: [{ position: "1", Driver: sampleDrivers[1].Driver }],
  },
  {
    season: "2024",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    date: "2024-03-09",
    Circuit: {},
    results: [{ position: "1", Driver: sampleDrivers[0].Driver }],
  },
  {
    season: "2024",
    round: "3",
    raceName: "Australian Grand Prix",
    date: "2024-03-24",
    Circuit: {},
    results: [{ position: "1", Driver: sampleDrivers[1].Driver }],
  },
];

const sampleSprintResults = [
  {
    season: "2024",
    round: "4",
    raceName: "Chinese Grand Prix Sprint",
    date: "2024-04-20",
    Circuit: {},
    results: [
      {
        position: "1",
        Driver: sampleDrivers[0].Driver,
        Constructor: sampleDrivers[0].Constructors[0],
      },
    ],
  },
  {
    season: "2024",
    round: "6",
    raceName: "Miami Grand Prix Sprint",
    date: "2024-05-04",
    Circuit: {},
    results: [
      {
        position: "1",
        Driver: sampleDrivers[0].Driver,
        Constructor: sampleDrivers[0].Constructors[0],
      },
    ],
  },
  {
    season: "2024",
    round: "11",
    raceName: "Austrian Grand Prix Sprint",
    date: "2024-06-29",
    Circuit: {},
    results: [
      {
        position: "1",
        Driver: sampleDrivers[2].Driver,
        Constructor: sampleDrivers[2].Constructors[0],
      },
    ],
  },
];

const sampleRaceResults = [
  {
    season: "2024",
    round: "1",
    raceName: "Bahrain Grand Prix",
    date: "2024-03-02",
    Circuit: {},
    results: [
      {
        position: "1",
        points: "25",
        status: "Finished",
        Time: { time: "1:31:44.742" },
        Driver: sampleDrivers[0].Driver,
        Constructor: sampleDrivers[0].Constructors[0],
      },
      {
        position: "2",
        points: "18",
        status: "Finished",
        Time: { time: "+11.987" },
        Driver: sampleDrivers[1].Driver,
        Constructor: sampleDrivers[1].Constructors[0],
      },
      {
        position: "17",
        points: "0",
        status: "+1 Lap",
        Driver: sampleDrivers[2].Driver,
        Constructor: sampleDrivers[2].Constructors[0],
      },
    ],
  },
  {
    season: "2024",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    date: "2024-03-09",
    Circuit: {},
    results: [
      {
        position: "1",
        points: "25",
        status: "Finished",
        Time: { time: "1:20:43.273" },
        Driver: sampleDrivers[1].Driver,
        Constructor: sampleDrivers[1].Constructors[0],
      },
      {
        position: "2",
        points: "18",
        status: "Finished",
        Time: { time: "+8.643" },
        Driver: sampleDrivers[0].Driver,
        Constructor: sampleDrivers[0].Constructors[0],
      },
      {
        position: "19",
        points: "0",
        status: "Accident",
        Driver: sampleDrivers[2].Driver,
        Constructor: sampleDrivers[2].Constructors[0],
      },
    ],
  },
  {
    season: "2024",
    round: "3",
    raceName: "Australian Grand Prix",
    date: "2024-03-24",
    Circuit: {},
    results: [
      {
        position: "3",
        points: "15",
        status: "Finished",
        Time: { time: "+19.997" },
        Driver: sampleDrivers[1].Driver,
        Constructor: sampleDrivers[1].Constructors[0],
      },
      {
        position: "18",
        points: "0",
        status: "Engine",
        Driver: sampleDrivers[0].Driver,
        Constructor: sampleDrivers[0].Constructors[0],
      },
      {
        position: "20",
        points: "0",
        status: "Disqualified",
        Driver: sampleDrivers[2].Driver,
        Constructor: sampleDrivers[2].Constructors[0],
      },
    ],
  },
];

const renderWithProviders = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: "/driverstandings",
    routes: [
      { path: "/driverstandings", element: <DriverStandings /> },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("DriverStandings", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    driversService.getDriverStandings.mockReset();
    driversService.getDriverStandingsTimeline.mockReset();
    driversService.getDriverStandingsTimeline.mockResolvedValue(sampleTimeline);
    vi.mocked(getAllRaceResults).mockReset();
    vi.mocked(getAllRaceResults).mockResolvedValue(sampleRaceResults);
    vi.mocked(getAllSprintResults).mockReset();
    vi.mocked(getAllSprintResults).mockResolvedValue(sampleSprintResults);
    vi.mocked(getAllQualifyingResults).mockReset();
    vi.mocked(getAllQualifyingResults).mockResolvedValue(
      sampleQualifyingResults
    );
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    anchorClickMock.mockClear();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURLMock,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      anchorClickMock(this.href, this.download);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the loader while the standings query is pending", async () => {
    driversService.getDriverStandings.mockReturnValue(new Promise(() => {}));
    await renderWithProviders();
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.queryByText(/Driver Standings/)).not.toBeInTheDocument();
  });

  it("sets the document title to 'Driver Standings'", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );
    await renderWithProviders();
    await waitFor(() => expect(document.title).toBe("Driver Standings"));
  });

  it("renders one row per driver with position, family name, points and link", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );
    await renderWithProviders();

    expect(await screen.findByText("Verstappen")).toBeInTheDocument();
    expect(screen.getByText("Max Verstappen")).toBeInTheDocument();
    expect(screen.getByText(/7 Grand Prix wins/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Most podiums this season/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/3 podium finishes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Most sprint wins this season/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/2 sprint wins/i)).toBeInTheDocument();
    expect(screen.getByText(/2 pole positions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /leclerc/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /norris/i })).toBeInTheDocument();

    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gap")).toHaveLength(sampleDrivers.length);
    expect(screen.getByText("Leader 0")).toBeInTheDocument();
    expect(screen.getByText("Ahead —")).toBeInTheDocument();
    expect(screen.getByText("Leader +50")).toBeInTheDocument();
    expect(screen.getByText("Leader +100")).toBeInTheDocument();
    expect(screen.getByText("Gained 1 place")).toBeInTheDocument();
    expect(screen.getByText("Lost 1 place")).toBeInTheDocument();
    expect(screen.getByText("No change from previous round")).toBeInTheDocument();
    expect(screen.getByText("300PTS")).toBeInTheDocument();
    expect(screen.getByText("250PTS")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /verstappen/i })).toHaveAttribute(
      "href",
      "/driver/max_verstappen"
    );
    expect(screen.getByRole("link", { name: /leclerc/i })).toHaveAttribute(
      "href",
      "/driver/leclerc"
    );
  });

  it("renders a ranking progression chart from round-by-round standings", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    expect(
      await screen.findByRole("heading", { name: /ranking progression/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("img", {
        name: /driver championship ranking progression by round/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /round 1, bahrain grand prix, max verstappen: position 2/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/R2 · Saudi Arabian Grand Prix/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/P1 · 43 pts/i)).toBeInTheDocument();
    expect(driversService.getDriverStandingsTimeline).toHaveBeenCalledWith(
      "2024"
    );
  });

  it("shows an unavailable message when ranking progression data cannot be loaded", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );
    driversService.getDriverStandingsTimeline.mockRejectedValue(
      new Error("timeline down")
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await renderWithProviders();

    expect(
      await screen.findByText(
        /round-by-round ranking data is unavailable for this season/i
      )
    ).toBeInTheDocument();
  });

  it("renders mobile-friendly card details for each driver", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );
    await renderWithProviders();

    expect(await screen.findByText("Max")).toBeInTheDocument();
    expect(screen.getByText("Charles")).toBeInTheDocument();
    expect(screen.getByText("Lando")).toBeInTheDocument();
    expect(screen.getAllByText("Team")).toHaveLength(sampleDrivers.length);
  });

  it("downloads the current driver standings data as a CSV file", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /download driver standings table data for 2024/i,
      })
    );

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv.split("\n")).toEqual([
      "Position,Driver,Team,Gap to leader,Gap to ahead,Points,Wins",
      "1,Max Verstappen,Red Bull,0,—,300,7",
      "2,Charles Leclerc,Ferrari,+50,+50,250,4",
      "3,Lando Norris,McLaren,+100,+50,200,2",
    ]);
    expect(anchorClickMock).toHaveBeenCalledWith(
      "blob:driver-standings",
      "2024-driver-standings.csv"
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:driver-standings");
  });

  it("renders translated Driver Standings content in Spanish", async () => {
    await i18n.changeLanguage("es");
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    expect(
      await screen.findByText("Clasificación de pilotos · 2024")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe("Clasificación de pilotos")
    );
    expect(
      screen.getByText("Más victorias esta temporada")
    ).toBeInTheDocument();
    expect(screen.getByText("7 victorias de Gran Premio")).toBeInTheDocument();
    expect(screen.getByText("Más podios esta temporada")).toBeInTheDocument();
    expect(screen.getByText("3 podios")).toBeInTheDocument();
    expect(screen.getAllByText("Diferencia")).toHaveLength(sampleDrivers.length);
    expect(screen.getByText("Líder +50")).toBeInTheDocument();
    expect(screen.getAllByText("Delante +50")).toHaveLength(2);
    expect(screen.getByText("Ganó 1 posición")).toBeInTheDocument();
    expect(screen.getByText("Perdió 1 posición")).toBeInTheDocument();
    expect(
      screen.getByText("Sin cambios respecto a la ronda anterior")
    ).toBeInTheDocument();
    expect(screen.getByText("300 PTOS")).toBeInTheDocument();
    expect(screen.getAllByText("Equipo")).toHaveLength(sampleDrivers.length);
    expect(
      screen.getByRole("heading", { name: "Progresión de la clasificación" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Progresión de la clasificación de pilotos del campeonato por ronda",
      })
    ).toBeInTheDocument();
  });

  it("renders the team logo when available and falls back to the team name otherwise", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );
    await renderWithProviders();

    expect(await screen.findByAltText("Red Bull")).toBeInTheDocument();
    expect(screen.getByAltText("Ferrari")).toBeInTheDocument();
    // McLaren's logo is not in the mocked teamLogo map so the team name is
    // rendered as plain text instead of an <img>.
    expect(screen.queryByAltText("McLaren")).not.toBeInTheDocument();
    expect(screen.getByText("McLaren")).toBeInTheDocument();
  });

  it("renders the header without driver rows when the standings list is empty", async () => {
    driversService.getDriverStandings.mockResolvedValue(buildResponse([]));
    await renderWithProviders();

    expect(
      await screen.findByText(/Driver Standings · 2024/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no driver standings available/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the header without driver rows when StandingsLists itself is empty", async () => {
    driversService.getDriverStandings.mockResolvedValue({
      MRData: { StandingsTable: { StandingsLists: [] } },
    });
    await renderWithProviders();

    expect(
      await screen.findByText(/Driver Standings · 2024/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no driver standings available/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("logs the error and renders no driver rows when the query fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("network down");
    driversService.getDriverStandings.mockRejectedValue(failure);

    await renderWithProviders();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching driver standings:",
        failure
      )
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
