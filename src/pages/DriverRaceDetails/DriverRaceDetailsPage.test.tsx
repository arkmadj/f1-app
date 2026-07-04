import { screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import DriverRaceDetailsPage from "./DriverRaceDetailsPage";
import { renderWithRouter } from "../../test-utils/router";
import {
  getCurrentSeasonRaces,
  getRacePitStops,
  getRaceResults,
} from "../../services/api/racesApi";

vi.mock("../../services/api/racesApi", () => ({
  getCurrentSeasonRaces: vi.fn(),
  getRacePitStops: vi.fn(),
  getRaceResults: vi.fn(),
}));

vi.mock("../../components/Loader/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));

const SAMPLE_RESULTS = [
  {
    position: "1",
    positionText: "1",
    points: "25",
    grid: "2",
    laps: "57",
    Time: { time: "1:30:00.000" },
    FastestLap: { lap: "44", Time: { time: "1:20.500" } },
    Driver: {
      driverId: "max_verstappen",
      code: "VER",
      givenName: "Max",
      familyName: "Verstappen",
    },
    Constructor: {
      constructorId: "red_bull",
      name: "Red Bull",
      nationality: "Austrian",
    },
  },
];

const SAMPLE_RACES = [
  {
    season: "2024",
    round: "5",
    raceName: "Miami Grand Prix",
    date: "2024-05-05",
    Circuit: {
      circuitId: "miami",
      circuitName: "Miami International Autodrome",
      Location: { locality: "Miami", country: "USA" },
    },
  },
];

const SAMPLE_PIT_STOPS = [
  {
    driverId: "max_verstappen",
    lap: "18",
    stop: "1",
    duration: "2.531",
    compound: "medium",
  },
  {
    driverId: "max_verstappen",
    lap: "42",
    stop: "2",
    duration: "2.874",
    compound: "hard",
  },
];

const renderDetailsPage = async (path = "/race/5/driver/max_verstappen") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: path,
    routes: [
      {
        path: "/race/$race/driver/$driver",
        element: <DriverRaceDetailsPage />,
      },
      { path: "/race/$race", element: <div data-testid="race-results-page" /> },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("DriverRaceDetailsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    getCurrentSeasonRaces.mockReset();
    getRacePitStops.mockReset();
    getRaceResults.mockReset();
    getCurrentSeasonRaces.mockResolvedValue(SAMPLE_RACES);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
  });

  it("renders race-specific details for the selected driver", async () => {
    await renderDetailsPage();

    expect(
      await screen.findByRole("heading", { name: "Max Verstappen" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Miami Grand Prix · 2024 Round 5")
    ).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("Red Bull")).toBeInTheDocument();
    expect(screen.getByText("25 pts")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getByText("1:20.500")).toBeInTheDocument();
    expect(screen.getAllByText("2 stops")).toHaveLength(2);
    expect(screen.getByText("Best stop 2.531s")).toBeInTheDocument();
    expect(screen.getByText("Medium → Hard")).toBeInTheDocument();
  });

  it("renders translated driver race details in Spanish", async () => {
    await i18n.changeLanguage("es");
    await renderDetailsPage();

    expect(
      await screen.findByText("Detalles de carrera del piloto")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Miami Grand Prix · 2024 ronda 5")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /perfil del piloto/i })
    ).toHaveAttribute("href", "/driver/max_verstappen");
    expect(screen.getByText("25 ptos")).toBeInTheDocument();
    expect(screen.getAllByText("2 paradas")).toHaveLength(2);
    expect(screen.getByText("Mejor parada 2.531s")).toBeInTheDocument();
    expect(screen.getByText("Medio → Duro")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe("Detalles de carrera del piloto")
    );
  });

  it("lists the driver's pit stops in strategy order", async () => {
    await renderDetailsPage();

    const pitStops = await screen.findByRole("region", {
      name: /race context/i,
    });
    expect(
      within(pitStops).getByText(/Stop 1 · Lap 18 · 2.531s · Medium/)
    ).toBeInTheDocument();
    expect(
      within(pitStops).getByText(/Stop 2 · Lap 42 · 2.874s · Hard/)
    ).toBeInTheDocument();
  });

  it("shows a tire strategy timeline with stint order and lap counts", async () => {
    await renderDetailsPage();

    const tireStrategy = await screen.findByRole("region", {
      name: /tire strategy/i,
    });

    expect(
      within(tireStrategy).getByLabelText(
        "Opening stint: Compound TBC, 18 laps"
      )
    ).toBeInTheDocument();
    expect(
      within(tireStrategy).getByLabelText("Stint 2: Medium, 24 laps")
    ).toBeInTheDocument();
    expect(
      within(tireStrategy).getByLabelText("Stint 3: Hard, 15 laps")
    ).toBeInTheDocument();
    expect(
      within(tireStrategy).getByText(/Laps 1-18 · 18 laps/)
    ).toBeInTheDocument();
    expect(
      within(tireStrategy).getByText(/Laps 19-42 · 24 laps/)
    ).toBeInTheDocument();
    expect(
      within(tireStrategy).getByText(/Laps 43-57 · 15 laps/)
    ).toBeInTheDocument();
  });

  it("shows an empty state when the driver is not in the race classification", async () => {
    await renderDetailsPage("/race/5/driver/leclerc");

    expect(
      await screen.findByRole("heading", { name: /driver result not found/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to race results/i })
    ).toHaveAttribute("href", "/race/5");
  });
});
