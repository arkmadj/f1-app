import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import teamsService from "../../services/api/constructorsApi";
import {
  getAllQualifyingResults,
  getAllRaceResults,
  getAllSprintResults,
} from "../../services/api/racesApi";
import driversService from "../../services/api/testapi";
import { renderWithRouter } from "../../test-utils/router";
import SeasonLeaders from "./SeasonLeaders";

vi.mock("../../services/api/testapi", () => ({
  default: {
    getDriverStandings: vi.fn(),
  },
}));

vi.mock("../../services/api/constructorsApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/api/constructorsApi")>();

  return {
    ...actual,
    default: {
      ...actual.default,
      getAll: vi.fn(),
    },
  };
});

vi.mock("../../services/api/racesApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/api/racesApi")>();

  return {
    ...actual,
    getAllRaceResults: vi.fn(),
    getAllSprintResults: vi.fn(),
    getAllQualifyingResults: vi.fn(),
  };
});

const driverStandingsResponse = {
  MRData: {
    StandingsTable: {
      StandingsLists: [
        {
          season: "2023",
          round: "5",
          DriverStandings: [
            {
              position: "1",
              points: "110",
              wins: "3",
              Driver: {
                driverId: "max_verstappen",
                givenName: "Max",
                familyName: "Verstappen",
              },
              Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
            },
            {
              position: "2",
              points: "92",
              wins: "1",
              Driver: {
                driverId: "charles_leclerc",
                givenName: "Charles",
                familyName: "Leclerc",
              },
              Constructors: [{ constructorId: "ferrari", name: "Ferrari" }],
            },
          ],
        },
      ],
    },
  },
};

const constructorStandingsResponse = {
  MRData: {
    StandingsTable: {
      StandingsLists: [
        {
          season: "2023",
          round: "5",
          ConstructorStandings: [
            {
              position: "1",
              points: "180",
              wins: "4",
              Constructor: { constructorId: "red_bull", name: "Red Bull" },
            },
            {
              position: "2",
              points: "140",
              wins: "1",
              Constructor: { constructorId: "ferrari", name: "Ferrari" },
            },
          ],
        },
      ],
    },
  },
};

const maxDriver =
  driverStandingsResponse.MRData.StandingsTable.StandingsLists[0].DriverStandings[0]
    .Driver;
const leclercDriver =
  driverStandingsResponse.MRData.StandingsTable.StandingsLists[0].DriverStandings[1]
    .Driver;

const raceResults = [
  {
    season: "2023",
    round: "1",
    raceName: "Bahrain Grand Prix",
    Circuit: {},
    results: [
      {
        position: "1",
        points: "25",
        grid: "1",
        status: "Finished",
        Time: { time: "1:30:00" },
        FastestLap: { rank: "2" },
        Driver: maxDriver,
        Constructor: { constructorId: "red_bull", name: "Red Bull" },
      },
      {
        position: "2",
        points: "18",
        grid: "3",
        status: "Finished",
        Time: { time: "+5.000" },
        FastestLap: { rank: "1" },
        Driver: leclercDriver,
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
    ],
  },
  {
    season: "2023",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    Circuit: {},
    results: [
      {
        position: "1",
        points: "25",
        grid: "2",
        status: "Finished",
        Time: { time: "1:31:00" },
        FastestLap: { rank: "2" },
        Driver: maxDriver,
        Constructor: { constructorId: "red_bull", name: "Red Bull" },
      },
      {
        position: "18",
        points: "0",
        grid: "4",
        status: "Engine",
        FastestLap: { rank: "1" },
        Driver: leclercDriver,
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
    ],
  },
];

const qualifyingResults = [
  {
    season: "2023",
    round: "1",
    raceName: "Bahrain Grand Prix",
    Circuit: {},
    results: [
      {
        position: "1",
        Driver: leclercDriver,
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
    ],
  },
  {
    season: "2023",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    Circuit: {},
    results: [
      {
        position: "1",
        Driver: leclercDriver,
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
    ],
  },
];

const sprintResults = [
  {
    season: "2023",
    round: "3",
    raceName: "Sprint",
    Circuit: {},
    results: [
      {
        position: "1",
        Driver: maxDriver,
        Constructor: { constructorId: "red_bull", name: "Red Bull" },
      },
    ],
  },
];

const renderSeasonLeaders = async (
  initialPath = "/season-leaders?season=2023"
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return renderWithRouter({
    initialPath,
    routes: [
      { path: "/season-leaders", element: <SeasonLeaders /> },
      { path: "/driver/$id", element: <div>Driver profile</div> },
      { path: "/constructor/$id", element: <div>Constructor profile</div> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("SeasonLeaders", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    driversService.getDriverStandings.mockReset();
    driversService.getDriverStandings.mockResolvedValue(driverStandingsResponse);
    teamsService.getAll.mockReset();
    teamsService.getAll.mockResolvedValue(constructorStandingsResponse);
    vi.mocked(getAllRaceResults).mockReset();
    vi.mocked(getAllRaceResults).mockResolvedValue(raceResults);
    vi.mocked(getAllQualifyingResults).mockReset();
    vi.mocked(getAllQualifyingResults).mockResolvedValue(qualifyingResults);
    vi.mocked(getAllSprintResults).mockReset();
    vi.mocked(getAllSprintResults).mockResolvedValue(sprintResults);
  });

  it("renders unofficial leader cards including fastest laps", async () => {
    await renderSeasonLeaders();

    expect(
      await screen.findByRole("heading", { name: "Season Leaders · 2023" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Most fastest laps").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 fastest laps").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Charles Leclerc" })[0]
    ).toHaveAttribute("href", "/driver/charles_leclerc?season=2023");
    expect(screen.getAllByRole("link", { name: "Ferrari" })[0]).toHaveAttribute(
      "href",
      "/constructor/ferrari?season=2023"
    );
    await waitFor(() => expect(document.title).toBe("Season Leaders"));
  });

  it("renders translated content in Spanish", async () => {
    await i18n.changeLanguage("es");
    await renderSeasonLeaders();

    expect(
      await screen.findByRole("heading", { name: "Líderes de temporada · 2023" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Más vueltas rápidas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 vueltas rápidas").length).toBeGreaterThan(0);
    await waitFor(() => expect(document.title).toBe("Líderes de temporada"));
  });
});