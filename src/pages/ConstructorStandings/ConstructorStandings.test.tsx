import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConstructorStandings from "./ConstructorStandings";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";
import teamsService from "../../services/api/constructorsApi";
import {
  getAllQualifyingResults,
  getAllRaceResults,
} from "../../services/api/racesApi";

// Replace the API service with a vi-mock so each test can drive the
// useQuery state (loading / success / error) deterministically.
vi.mock("../../services/api/constructorsApi", () => ({
  default: { getAll: vi.fn(), getConstructorStandingsTimeline: vi.fn() },
}));

vi.mock("../../services/api/racesApi", () => ({
  getAllQualifyingResults: vi.fn(),
  getAllRaceResults: vi.fn(),
}));

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

const buildResponse = (constructorStandings) => ({
  MRData: {
    StandingsTable: {
      StandingsLists: [
        {
          season: "2024",
          round: "10",
          ConstructorStandings: constructorStandings,
        },
      ],
    },
  },
});

const createObjectURLMock = vi.fn(() => "blob:constructor-standings");
const revokeObjectURLMock = vi.fn();
const anchorClickMock = vi.fn();

const sampleConstructors = [
  {
    position: "1",
    points: "500",
    wins: "8",
    Constructor: {
      constructorId: "red_bull",
      name: "Red Bull",
      nationality: "Austrian",
    },
  },
  {
    position: "2",
    points: "400",
    wins: "3",
    Constructor: {
      constructorId: "ferrari",
      name: "Ferrari",
      nationality: "Italian",
    },
  },
  {
    position: "3",
    points: "350",
    wins: "1",
    Constructor: {
      constructorId: "mclaren",
      name: "McLaren",
      nationality: "British",
    },
  },
];

const sampleTimeline = [
  {
    season: "2024",
    round: "9",
    raceName: "Canadian Grand Prix",
    date: "2024-06-09",
    ConstructorStandings: [
      { ...sampleConstructors[0], position: "1" },
      { ...sampleConstructors[2], position: "2" },
      { ...sampleConstructors[1], position: "3" },
    ],
  },
  {
    season: "2024",
    round: "10",
    raceName: "Spanish Grand Prix",
    date: "2024-06-23",
    ConstructorStandings: sampleConstructors,
  },
];

const sampleQualifyingResults = [
  {
    season: "2024",
    round: "1",
    raceName: "Bahrain Grand Prix",
    date: "2024-03-02",
    results: [
      {
        number: "55",
        position: "1",
        Driver: {
          driverId: "sainz",
          givenName: "Carlos",
          familyName: "Sainz",
        },
        Constructor: {
          constructorId: "ferrari",
          name: "Ferrari",
        },
      },
      {
        number: "1",
        position: "2",
        Driver: {
          driverId: "max_verstappen",
          givenName: "Max",
          familyName: "Verstappen",
        },
        Constructor: {
          constructorId: "red_bull",
          name: "Red Bull",
        },
      },
      {
        number: "16",
        position: "4",
        Driver: {
          driverId: "leclerc",
          givenName: "Charles",
          familyName: "Leclerc",
        },
        Constructor: {
          constructorId: "ferrari",
          name: "Ferrari",
        },
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
        number: "16",
        position: "1",
        Driver: {
          driverId: "leclerc",
          givenName: "Charles",
          familyName: "Leclerc",
        },
        Constructor: {
          constructorId: "ferrari",
          name: "Ferrari",
        },
      },
      {
        number: "11",
        position: "5",
        Driver: {
          driverId: "perez",
          givenName: "Sergio",
          familyName: "Perez",
        },
        Constructor: {
          constructorId: "red_bull",
          name: "Red Bull",
        },
      },
    ],
  },
  {
    season: "2024",
    round: "3",
    raceName: "Australian Grand Prix",
    date: "2024-03-24",
    results: [
      {
        number: "1",
        position: "1",
        Driver: {
          driverId: "max_verstappen",
          givenName: "Max",
          familyName: "Verstappen",
        },
        Constructor: {
          constructorId: "red_bull",
          name: "Red Bull",
        },
      },
      {
        number: "16",
        position: "4",
        Driver: {
          driverId: "leclerc",
          givenName: "Charles",
          familyName: "Leclerc",
        },
        Constructor: {
          constructorId: "ferrari",
          name: "Ferrari",
        },
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
    results: [
      {
        number: "55",
        position: "1",
        points: "25",
        grid: "3",
        Driver: {
          driverId: "sainz",
          givenName: "Carlos",
          familyName: "Sainz",
        },
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
      {
        number: "4",
        position: "2",
        points: "18",
        grid: "2",
        Driver: {
          driverId: "norris",
          givenName: "Lando",
          familyName: "Norris",
        },
        Constructor: { constructorId: "mclaren", name: "McLaren" },
      },
      {
        number: "81",
        position: "3",
        points: "15",
        grid: "5",
        Driver: {
          driverId: "piastri",
          givenName: "Oscar",
          familyName: "Piastri",
        },
        Constructor: { constructorId: "mclaren", name: "McLaren" },
      },
      {
        number: "16",
        position: "18",
        points: "0",
        status: "DNF",
        grid: "4",
        Driver: {
          driverId: "leclerc",
          givenName: "Charles",
          familyName: "Leclerc",
        },
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
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
        number: "1",
        position: "1",
        points: "25",
        grid: "1",
        Driver: {
          driverId: "max_verstappen",
          givenName: "Max",
          familyName: "Verstappen",
        },
        Constructor: { constructorId: "red_bull", name: "Red Bull" },
      },
      {
        number: "4",
        position: "2",
        points: "18",
        grid: "2",
        Driver: {
          driverId: "norris",
          givenName: "Lando",
          familyName: "Norris",
        },
        Constructor: { constructorId: "mclaren", name: "McLaren" },
      },
      {
        number: "55",
        position: "3",
        points: "15",
        grid: "3",
        Driver: {
          driverId: "sainz",
          givenName: "Carlos",
          familyName: "Sainz",
        },
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
      {
        number: "16",
        position: "17",
        points: "0",
        status: "Engine",
        grid: "4",
        Driver: {
          driverId: "leclerc",
          givenName: "Charles",
          familyName: "Leclerc",
        },
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
      {
        number: "11",
        position: "8",
        points: "4",
        grid: "6",
        Driver: {
          driverId: "perez",
          givenName: "Sergio",
          familyName: "Perez",
        },
        Constructor: { constructorId: "red_bull", name: "Red Bull" },
      },
    ],
  },
  {
    season: "2024",
    round: "3",
    raceName: "Australian Grand Prix",
    date: "2024-03-24",
    results: [
      {
        number: "81",
        position: "1",
        points: "25",
        grid: "3",
        Driver: {
          driverId: "piastri",
          givenName: "Oscar",
          familyName: "Piastri",
        },
        Constructor: { constructorId: "mclaren", name: "McLaren" },
      },
      {
        number: "1",
        position: "2",
        points: "18",
        grid: "1",
        Driver: {
          driverId: "max_verstappen",
          givenName: "Max",
          familyName: "Verstappen",
        },
        Constructor: { constructorId: "red_bull", name: "Red Bull" },
      },
      {
        number: "4",
        position: "3",
        points: "15",
        grid: "2",
        Driver: {
          driverId: "norris",
          givenName: "Lando",
          familyName: "Norris",
        },
        Constructor: { constructorId: "mclaren", name: "McLaren" },
      },
      {
        number: "16",
        position: "9",
        points: "2",
        grid: "6",
        Driver: {
          driverId: "leclerc",
          givenName: "Charles",
          familyName: "Leclerc",
        },
        Constructor: { constructorId: "ferrari", name: "Ferrari" },
      },
    ],
  },
];

const renderWithProviders = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: "/constructorstandings",
    routes: [
      { path: "/constructorstandings", element: <ConstructorStandings /> },
      {
        path: "/constructor/$id",
        element: <div data-testid="constructor-page" />,
      },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("ConstructorStandings", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    teamsService.getAll.mockReset();
    teamsService.getConstructorStandingsTimeline.mockReset();
    getAllRaceResults.mockReset();
    getAllQualifyingResults.mockReset();
    teamsService.getConstructorStandingsTimeline.mockResolvedValue([]);
    getAllRaceResults.mockResolvedValue([]);
    getAllQualifyingResults.mockResolvedValue([]);
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
    teamsService.getAll.mockReturnValue(new Promise(() => {}));
    await renderWithProviders();
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.queryByText(/Constructor Standings/)).not.toBeInTheDocument();
  });

  it("sets the document title to 'Constructor Standings'", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    await renderWithProviders();
    await waitFor(() => expect(document.title).toBe("Constructor Standings"));
  });

  it("renders one compact row per constructor with position, name, stats and link", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    teamsService.getConstructorStandingsTimeline.mockResolvedValue(sampleTimeline);
    await renderWithProviders();

    expect(await screen.findByText("Red Bull")).toBeInTheDocument();
    expect(screen.getByText("Ferrari")).toBeInTheDocument();
    expect(screen.getByText("McLaren")).toBeInTheDocument();

    const redBullLink = screen.getByRole("link", { name: /red bull/i });
    const ferrariLink = screen.getByRole("link", { name: /ferrari/i });
    const mclarenLink = screen.getByRole("link", { name: /mclaren/i });

    expect(within(redBullLink).getByText("1")).toBeInTheDocument();
    expect(within(redBullLink).getByText("500")).toBeInTheDocument();
    expect(screen.getAllByText("pts")).toHaveLength(3);
    expect(within(redBullLink).getByText("8")).toBeInTheDocument();
    expect(screen.getAllByText("wins")).toHaveLength(3);
    expect(within(redBullLink).getByText("Gap")).toBeInTheDocument();
    expect(
      await screen.findByText("No change from previous round")
    ).toBeInTheDocument();
    expect(screen.getByText("Gained 1 place")).toBeInTheDocument();
    expect(screen.getByText("Lost 1 place")).toBeInTheDocument();
    expect(within(redBullLink).getByText("Leader 0")).toBeInTheDocument();
    expect(within(redBullLink).getByText("Ahead —")).toBeInTheDocument();
    expect(within(ferrariLink).getByText("Leader +100")).toBeInTheDocument();
    expect(within(ferrariLink).getByText("Ahead +100")).toBeInTheDocument();
    expect(within(mclarenLink).getByText("Leader +150")).toBeInTheDocument();
    expect(within(mclarenLink).getByText("Ahead +50")).toBeInTheDocument();

    expect(redBullLink).toHaveAttribute("href", "/constructor/red_bull");
    expect(ferrariLink).toHaveAttribute("href", "/constructor/ferrari");
  });

  it("downloads the current constructor standings data as a CSV file", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    teamsService.getConstructorStandingsTimeline.mockResolvedValue(sampleTimeline);

    await renderWithProviders();
    await screen.findByText("No change from previous round");

    fireEvent.click(
      await screen.findByRole("button", {
        name: /download constructor standings table data for 2024/i,
      })
    );

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv.split("\n")).toEqual([
      "Position,Team,Positions gained/lost,Gap to leader,Gap to ahead,Points,Wins",
      "1,Red Bull,No change from previous round,0,—,500,8",
      "2,Ferrari,Gained 1 place,+100,+100,400,3",
      "3,McLaren,Lost 1 place,+150,+50,350,1",
    ]);
    expect(anchorClickMock).toHaveBeenCalledWith(
      "blob:constructor-standings",
      "2024-constructor-standings.csv"
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith(
      "blob:constructor-standings"
    );
  });

  it("renders translated Constructor Standings content in Spanish", async () => {
    await i18n.changeLanguage("es");
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    teamsService.getConstructorStandingsTimeline.mockResolvedValue(sampleTimeline);
    getAllRaceResults.mockResolvedValue(sampleRaceResults);
    getAllQualifyingResults.mockResolvedValue(sampleQualifyingResults);

    await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: "Clasificación de constructores",
      })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe("Clasificación de constructores")
    );
    expect(screen.getByText("Temporada 2024")).toBeInTheDocument();
    expect(
      screen.getByText("3 constructores clasificados por puntos")
    ).toBeInTheDocument();

    const spotlight = await screen.findByRole("region", {
      name: /constructores destacados/i,
    });

    expect(
      within(spotlight).getByText("Foco de la temporada")
    ).toBeInTheDocument();
    expect(
      within(spotlight).getByRole("heading", {
        name: "Más victorias de carrera",
      })
    ).toBeInTheDocument();
    expect(
      await within(spotlight).findByText(/red bull lidera el grupo en 2024/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("ptos")).toHaveLength(sampleConstructors.length);
    expect(screen.getAllByText("victorias")).toHaveLength(
      sampleConstructors.length
    );
    expect(screen.getAllByText("Diferencia")).toHaveLength(sampleConstructors.length);
    expect(screen.getByText("Sin cambios respecto a la ronda anterior")).toBeInTheDocument();
    expect(screen.getByText("Ganó 1 posición")).toBeInTheDocument();
    expect(screen.getByText("Perdió 1 posición")).toBeInTheDocument();
    expect(screen.getByText("Líder 0")).toBeInTheDocument();
    expect(screen.getByText("Delante —")).toBeInTheDocument();
    expect(screen.getByText("Líder +100")).toBeInTheDocument();
    expect(screen.getByText("Delante +50")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /ver detalles del constructor red bull/i,
      })
    ).toBeInTheDocument();
  });

  it("renders season spotlight cards for the constructors with the most wins, poles, podiums, DNFs and penalties", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    getAllRaceResults.mockResolvedValue(sampleRaceResults);
    getAllQualifyingResults.mockResolvedValue(sampleQualifyingResults);
    await renderWithProviders();

    const spotlight = await screen.findByRole("region", {
      name: /constructor standouts/i,
    });

    expect(
      within(spotlight).getByRole("heading", { name: /most race wins/i })
    ).toBeInTheDocument();
    expect(
      within(spotlight).getByText(/red bull leads the field in 2024/i)
    ).toBeInTheDocument();
    expect(within(spotlight).getByText("8")).toBeInTheDocument();
    expect(within(spotlight).getByText("race wins")).toBeInTheDocument();
    const poleCardHeading = await within(spotlight).findByRole("heading", {
      name: /most pole positions/i,
    });
    expect(poleCardHeading).toBeInTheDocument();
    expect(
      await within(spotlight).findByText(/ferrari leads qualifying in 2024/i)
    ).toBeInTheDocument();
    const poleCard = poleCardHeading.closest("article");
    expect(poleCard).not.toBeNull();
    expect(within(poleCard as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(
      within(poleCard as HTMLElement).getByText("pole positions")
    ).toBeInTheDocument();
    expect(
      await within(spotlight).findByRole("heading", {
        name: /most podium finishes/i,
      })
    ).toBeInTheDocument();
    expect(
      await within(spotlight).findByText(
        /mclaren reaches the top three most often in 2024/i
      )
    ).toBeInTheDocument();
    expect(within(spotlight).getByText("5")).toBeInTheDocument();
    expect(within(spotlight).getByText("podium finishes")).toBeInTheDocument();
    const dnfCardHeading = await within(spotlight).findByRole("heading", {
      name: /most dnfs/i,
    });
    expect(dnfCardHeading).toBeInTheDocument();
    expect(
      await within(spotlight).findByText(
        /ferrari recorded the most dnfs in 2024/i
      )
    ).toBeInTheDocument();
    const dnfCard = dnfCardHeading.closest("article");
    expect(dnfCard).not.toBeNull();
    expect(within(dnfCard as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(
      within(dnfCard as HTMLElement).getByText("DNFs")
    ).toBeInTheDocument();
    const penaltiesCardHeading = await within(spotlight).findByRole("heading", {
      name: /most penalties/i,
    });
    expect(penaltiesCardHeading).toBeInTheDocument();
    expect(
      await within(spotlight).findByText(
        /ferrari took the most grid penalties in 2024/i
      )
    ).toBeInTheDocument();
    const penaltiesCard = penaltiesCardHeading.closest("article");
    expect(penaltiesCard).not.toBeNull();
    expect(
      within(penaltiesCard as HTMLElement).getByText("3")
    ).toBeInTheDocument();
    expect(
      within(penaltiesCard as HTMLElement).getByText("grid penalties")
    ).toBeInTheDocument();
  });

  it("uses compact card styling for constructor rows", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    await renderWithProviders();

    const redBullLink = await screen.findByRole("link", { name: /red bull/i });
    const redBullCard = redBullLink.firstElementChild as HTMLElement;

    expect(redBullLink).toHaveClass("group", "block");
    expect(redBullCard).toHaveClass(
      "grid",
      "rounded-2xl",
      "bg-(--background-buttons)",
      "shadow-[0_6px_18px_rgba(0,0,0,0.07)]",
      "md:grid-cols-[auto_auto_1fr_auto]"
    );
  });

  it("renders the team logo when available and falls back to the team name otherwise", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse(sampleConstructors));
    await renderWithProviders();

    expect(await screen.findByAltText("Red Bull logo")).toBeInTheDocument();
    expect(screen.getByAltText("Ferrari logo")).toBeInTheDocument();
    // McLaren's logo is not in the mocked teamLogo map so the team name is
    // represented by compact initials instead of an <img>.
    expect(screen.queryByAltText("McLaren logo")).not.toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders the header without constructor rows when the standings list is empty", async () => {
    teamsService.getAll.mockResolvedValue(buildResponse([]));
    await renderWithProviders();

    expect(
      await screen.findByRole("heading", { name: /^Constructor Standings$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /no constructor standings available/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /most race wins/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the header without constructor rows when StandingsLists itself is empty", async () => {
    teamsService.getAll.mockResolvedValue({
      MRData: { StandingsTable: { StandingsLists: [] } },
    });
    await renderWithProviders();

    expect(
      await screen.findByRole("heading", { name: /^Constructor Standings$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /no constructor standings available/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("logs the error and renders no constructor rows when the query fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("network down");
    teamsService.getAll.mockRejectedValue(failure);

    await renderWithProviders();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching constructor standings:",
        failure
      )
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
