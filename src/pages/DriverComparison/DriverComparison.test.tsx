import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DriverComparison from "./DriverComparison";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";
import { validateDriverComparisonSearch } from "../../domain/f1/driverComparisonSearch";
import driversService from "../../services/api/testapi";

vi.mock("../../services/api/testapi", () => ({
  default: {
    getDriverStandings: vi.fn(),
    getDriverStandingsTimeline: vi.fn(),
  },
}));

vi.mock("react-world-flags", () => ({
  default: ({ code }: { code: string }) => (
    <span data-testid="flag" data-code={code} />
  ),
}));

vi.mock("../../domain/f1/driversImage", () => ({
  getDriverImage: (driverId: string) => `${driverId}.webp`,
}));

vi.mock("../../domain/f1/teamLogo", () => {
  const logos: Record<string, string> = {
    "Red Bull": "redbull.webp",
    Ferrari: "ferrari.webp",
    McLaren: "mclaren.webp",
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

const sampleDrivers = [
  {
    position: "1",
    points: "300",
    wins: "7",
    Driver: {
      driverId: "max_verstappen",
      permanentNumber: "1",
      code: "VER",
      givenName: "Max",
      familyName: "Verstappen",
      dateOfBirth: "1997-09-30",
      nationality: "Dutch",
    },
    Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
  },
  {
    position: "2",
    points: "250",
    wins: "3",
    Driver: {
      driverId: "leclerc",
      permanentNumber: "16",
      code: "LEC",
      givenName: "Charles",
      familyName: "Leclerc",
      dateOfBirth: "1997-10-16",
      nationality: "Monegasque",
    },
    Constructors: [{ constructorId: "ferrari", name: "Ferrari" }],
  },
  {
    position: "3",
    points: "200",
    wins: "1",
    Driver: {
      driverId: "norris",
      permanentNumber: "4",
      code: "NOR",
      givenName: "Lando",
      familyName: "Norris",
      dateOfBirth: "1999-11-13",
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
      { ...sampleDrivers[0], position: "1", points: "26", wins: "1" },
      { ...sampleDrivers[1], position: "3", points: "12", wins: "0" },
      { ...sampleDrivers[2], position: "6", points: "8", wins: "0" },
    ],
  },
  {
    season: "2024",
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    date: "2024-03-09",
    DriverStandings: [
      { ...sampleDrivers[0], position: "1", points: "51", wins: "2" },
      { ...sampleDrivers[1], position: "2", points: "30", wins: "0" },
      { ...sampleDrivers[2], position: "5", points: "16", wins: "0" },
    ],
  },
];

const renderWithProviders = async (
  initialPath: string = "/driver-comparison"
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath,
    routes: [
      {
        path: "/driver-comparison",
        element: <DriverComparison />,
        validateSearch: validateDriverComparisonSearch,
      },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("DriverComparison", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    driversService.getDriverStandings.mockReset();
    driversService.getDriverStandingsTimeline.mockReset();
    driversService.getDriverStandingsTimeline.mockResolvedValue(sampleTimeline);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the skeleton while standings are loading", async () => {
    driversService.getDriverStandings.mockReturnValue(new Promise(() => {}));

    await renderWithProviders();

    expect(screen.getByTestId("driver-comparison-page-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading driver comparison"
    );
  });

  it("renders the default side-by-side comparison from the top two drivers", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    const { router } = await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: /compare drivers side by side/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Driver one")).toHaveValue("max_verstappen");
    expect(screen.getByLabelText("Driver two")).toHaveValue("leclerc");
    expect(
      screen.getByText("Max Verstappen vs Charles Leclerc")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Max Verstappen leads by 50 points")
    ).toBeInTheDocument();
    expect(screen.getByAltText("Max Verstappen portrait")).toHaveAttribute(
      "src",
      "max_verstappen.webp"
    );
    expect(
      screen.getAllByRole("link", { name: /view profile/i })[0]
    ).toHaveAttribute("href", "/driver/max_verstappen");
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        driver1: "max_verstappen",
        driver2: "leclerc",
      })
    );
  });

  it("renders localized Spanish content", async () => {
    await i18n.changeLanguage("es");
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: /compara pilotos lado a lado/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Piloto uno")).toHaveValue("max_verstappen");
    expect(screen.getByLabelText("Piloto dos")).toHaveValue("leclerc");
    expect(
      screen.getByText("Max Verstappen aventaja por 50 puntos")
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /ver perfil/i })[0]
    ).toHaveAttribute("href", "/driver/max_verstappen");
    expect(
      screen.getByRole("button", { name: /compartir comparación/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /fortalezas del piloto/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /evolución de puntos/i })
    ).toBeInTheDocument();
  });

  it("updates the comparison when a different driver is selected", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    const { router } = await renderWithProviders(
      "/driver-comparison?season=2023"
    );

    fireEvent.change(await screen.findByLabelText("Driver two"), {
      target: { value: "norris" },
    });

    await waitFor(() =>
      expect(
        screen.getByText("Max Verstappen vs Lando Norris")
      ).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Driver two")).toHaveValue("norris");
    expect(
      screen.getByText("Max Verstappen leads by 100 points")
    ).toBeInTheDocument();
    expect(screen.getByAltText("Lando Norris portrait")).toHaveAttribute(
      "src",
      "norris.webp"
    );
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        season: "2023",
        driver1: "max_verstappen",
        driver2: "norris",
      })
    );
  });

  it("renders an interactive points evolution chart for selected drivers", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    expect(
      await screen.findByRole("heading", { name: /points evolution/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText("R2 · Saudi Arabian Grand Prix")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /max verstappen and charles leclerc cumulative points by round/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("51 pts")).toBeInTheDocument();
    expect(screen.getByText("30 pts")).toBeInTheDocument();

    fireEvent.mouseEnter(
      screen.getByRole("button", {
        name: /round 1, bahrain grand prix, charles leclerc: 12 points/i,
      })
    );

    expect(screen.getByText("R1 · Bahrain Grand Prix")).toBeInTheDocument();
    expect(screen.getByText("12 pts")).toBeInTheDocument();
  });

  it("renders statistical radar charts for driver strengths", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    expect(
      await screen.findByRole("heading", { name: /driver strengths/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /max verstappen and charles leclerc 2024 strength radar chart/i,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Championship rank")).toHaveLength(2);
    expect(screen.getAllByText("Recent form")).toHaveLength(2);
    expect(await screen.findByText(/51 pts recent/i)).toBeInTheDocument();
    expect(screen.getByText(/30 pts recent/i)).toBeInTheDocument();
  });

  it("hydrates the selected drivers from the URL search params", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders(
      "/driver-comparison?driver1=leclerc&driver2=norris"
    );

    expect(
      await screen.findByText("Charles Leclerc vs Lando Norris")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Driver one")).toHaveValue("leclerc");
    expect(screen.getByLabelText("Driver two")).toHaveValue("norris");
  });

  it("copies a shareable comparison link from the share button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders(
      "/driver-comparison?season=2023&driver1=leclerc&driver2=norris"
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /share comparison/i })
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedUrl = writeText.mock.calls[0][0];
    expect(copiedUrl).toContain("/driver-comparison?");
    expect(copiedUrl).toContain("season=2023");
    expect(copiedUrl).toContain("driver1=leclerc");
    expect(copiedUrl).toContain("driver2=norris");
    expect(
      screen.getByText("Comparison link copied to clipboard.")
    ).toBeInTheDocument();
  });

  it("renders an empty state when fewer than two drivers are available", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse([sampleDrivers[0]])
    );

    await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: /not enough drivers to compare/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Driver one")).not.toBeInTheDocument();
  });

  it("sets the document title", async () => {
    driversService.getDriverStandings.mockResolvedValue(
      buildResponse(sampleDrivers)
    );

    await renderWithProviders();

    await waitFor(() => expect(document.title).toBe("Driver Comparison"));
  });
});
