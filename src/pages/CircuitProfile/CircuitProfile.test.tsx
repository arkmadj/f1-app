import { fireEvent, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CircuitProfile from "./CircuitProfile";
import { favoriteCircuitsStorageKey } from "../../app/favoriteCircuits";
import { renderWithRouter } from "../../test-utils/router";
import {
  getCircuit,
  getCircuitPodiumFinishers,
  getCircuitPoleSitters,
  getCircuitRaceWinners,
  getCurrentSeasonRaces,
} from "../../services/api/racesApi";

vi.mock("../../services/api/racesApi", () => ({
  getCircuit: vi.fn(),
  getCircuitPodiumFinishers: vi.fn(),
  getCircuitPoleSitters: vi.fn(),
  getCircuitRaceWinners: vi.fn(),
  getCurrentSeasonRaces: vi.fn(),
}));

vi.mock("../../components/Loader/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));

vi.mock("react-world-flags", () => ({
  default: ({ code }) => <span data-testid="flag" data-code={code} />,
}));

const SAMPLE_CIRCUIT = {
  circuitId: "monza",
  circuitName: "Autodromo Nazionale di Monza",
  url: "https://example.com/monza",
  Location: {
    lat: "45.6156",
    long: "9.28111",
    locality: "Monza",
    country: "Italy",
  },
};

const SAMPLE_RACES = [
  {
    season: "2026",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "9999-09-06",
    time: "13:00:00Z",
    Circuit: SAMPLE_CIRCUIT,
  },
];

const SAMPLE_WINNERS = [
  {
    season: "2025",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2025-09-07",
    Circuit: SAMPLE_CIRCUIT,
    Results: [
      {
        position: "1",
        points: "25",
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
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2024-09-01",
    Circuit: SAMPLE_CIRCUIT,
    Results: [
      {
        position: "1",
        points: "25",
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
    season: "2023",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2023-09-03",
    Circuit: SAMPLE_CIRCUIT,
    Results: [
      {
        position: "1",
        points: "25",
        Driver: {
          driverId: "hamilton",
          givenName: "Lewis",
          familyName: "Hamilton",
        },
        Constructor: {
          constructorId: "mercedes",
          name: "Mercedes",
        },
      },
    ],
  },
];

const SAMPLE_POLE_SITTERS = [
  {
    season: "2025",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2025-09-07",
    Circuit: SAMPLE_CIRCUIT,
    QualifyingResults: [
      {
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
    ],
  },
  {
    season: "2024",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2024-09-01",
    Circuit: SAMPLE_CIRCUIT,
    QualifyingResults: [
      {
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
    ],
  },
  {
    season: "2023",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2023-09-03",
    Circuit: SAMPLE_CIRCUIT,
    QualifyingResults: [
      {
        position: "1",
        Driver: {
          driverId: "hamilton",
          givenName: "Lewis",
          familyName: "Hamilton",
        },
        Constructor: {
          constructorId: "mercedes",
          name: "Mercedes",
        },
      },
    ],
  },
];

const SAMPLE_PODIUM_FINISHERS = [
  {
    season: "2025",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2025-09-07",
    Circuit: SAMPLE_CIRCUIT,
    Results: [
      {
        position: "1",
        points: "25",
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
        position: "2",
        points: "18",
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
    ],
  },
  {
    season: "2024",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2024-09-01",
    Circuit: SAMPLE_CIRCUIT,
    Results: [
      {
        position: "3",
        points: "15",
        Driver: {
          driverId: "hamilton",
          givenName: "Lewis",
          familyName: "Hamilton",
        },
        Constructor: {
          constructorId: "mercedes",
          name: "Mercedes",
        },
      },
    ],
  },
  {
    season: "2023",
    round: "16",
    raceName: "Italian Grand Prix",
    date: "2023-09-03",
    Circuit: SAMPLE_CIRCUIT,
    Results: [
      {
        position: "2",
        points: "18",
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

const renderCircuitProfile = async (path = "/circuit/monza?season=2026") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: path,
    routes: [
      { path: "/circuit/$id", element: <CircuitProfile /> },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
      { path: "/race/$race", element: <div data-testid="race-page" /> },
      { path: "/schedule", element: <div data-testid="schedule-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("CircuitProfile", () => {
  beforeEach(() => {
    getCircuit.mockReset();
    getCircuitPodiumFinishers.mockReset();
    getCircuitPoleSitters.mockReset();
    getCircuitRaceWinners.mockReset();
    getCurrentSeasonRaces.mockReset();
    getCircuitPodiumFinishers.mockResolvedValue([]);
    getCircuitPoleSitters.mockResolvedValue([]);
    getCircuitRaceWinners.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the loader while circuit details are pending", async () => {
    getCircuit.mockReturnValue(new Promise(() => {}));
    getCurrentSeasonRaces.mockReturnValue(new Promise(() => {}));
    await renderCircuitProfile();
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders circuit details, coordinates, flag and selected-season race links", async () => {
    getCircuit.mockResolvedValue(SAMPLE_CIRCUIT);
    getCurrentSeasonRaces.mockResolvedValue(SAMPLE_RACES);
    getCircuitPodiumFinishers.mockResolvedValue(SAMPLE_PODIUM_FINISHERS);
    getCircuitPoleSitters.mockResolvedValue(SAMPLE_POLE_SITTERS);
    getCircuitRaceWinners.mockResolvedValue(SAMPLE_WINNERS);
    await renderCircuitProfile();

    expect(
      await screen.findByRole("heading", {
        name: "Autodromo Nazionale di Monza",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Monza, Italy")).toBeInTheDocument();
    expect(screen.getByTestId("flag")).toHaveAttribute("data-code", "IT");
    expect(screen.getByText("45.6156° N")).toBeInTheDocument();
    expect(screen.getByText("9.2811° E")).toBeInTheDocument();
    expect(screen.getByText("Lap record holder")).toBeInTheDocument();
    expect(screen.getByText("Rubens Barrichello")).toBeInTheDocument();
    expect(screen.getByText("All-time wins leader")).toBeInTheDocument();
    expect(screen.getByText("Charles Leclerc (2 wins)")).toBeInTheDocument();
    expect(
      screen.getByText("All-time pole-position leader")
    ).toBeInTheDocument();
    expect(screen.getByText("Charles Leclerc (2 poles)")).toBeInTheDocument();
    expect(screen.getByText("Constructor wins leader")).toBeInTheDocument();
    expect(screen.getByText("Ferrari (2 wins)")).toBeInTheDocument();
    expect(screen.getByText("Constructor podium leader")).toBeInTheDocument();
    expect(screen.getByText("Ferrari (3 podiums)")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Track map explorer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Zoomable track map viewport" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Track map zoom")).toHaveValue("1");
    expect(screen.getByText(/100% zoom/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    expect(screen.getByLabelText("Track map zoom")).toHaveValue("1.25");
    expect(screen.getByText(/125% zoom · drag to pan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));

    expect(screen.getByLabelText("Track map zoom")).toHaveValue("1");
    expect(
      screen.getByRole("img", {
        name: /autodromo nazionale di monza track layout map/i,
      })
    ).toHaveAttribute(
      "src",
      expect.stringContaining("circuits/detailed/white-outline/monza-7.svg")
    );
    expect(screen.getByTestId("track-map-stage").style.aspectRatio).toBe(
      "420 / 280"
    );
    expect(screen.getByText("5.793 km")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("Clockwise")).toBeInTheDocument();
    const hotspotDetails = screen.getByRole("status", {
      name: "Track map hotspot details",
    });
    expect(
      within(hotspotDetails).getByText("Hover a sector or corner")
    ).toBeInTheDocument();
    expect(
      within(hotspotDetails).getByText(/6 interactive hotspots available/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Sector 1: Rettifilo")).toBeInTheDocument();
    expect(
      screen.getByText("Sector 3: Ascari and Parabolica")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Corner markers: T1, T6, T11/i)
    ).toBeInTheDocument();

    const sectorHotspot = screen.getByRole("button", {
      name: /Sector 1: Rettifilo\. Reference point for this sector on the 11-turn layout\./i,
    });

    fireEvent.mouseEnter(sectorHotspot);

    expect(
      within(hotspotDetails).getByText("Sector 1: Rettifilo")
    ).toBeInTheDocument();
    expect(
      within(hotspotDetails).getByText("Sector reference")
    ).toBeInTheDocument();
    expect(
      within(hotspotDetails).getByText("Clockwise · 5.793 km lap")
    ).toBeInTheDocument();

    const cornerHotspot = screen.getByRole("button", {
      name: /T1\. Turn 1 reference near Sector 1: Rettifilo/i,
    });

    fireEvent.mouseEnter(cornerHotspot);

    expect(within(hotspotDetails).getByText("T1")).toBeInTheDocument();
    expect(
      within(hotspotDetails).getByText("Corner reference")
    ).toBeInTheDocument();
    expect(
      within(hotspotDetails).getByText("Turn 1 of 11 · Clockwise")
    ).toBeInTheDocument();

    fireEvent.mouseLeave(cornerHotspot);

    expect(
      within(hotspotDetails).getByText("Hover a sector or corner")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open satellite map" })
    ).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=45.6156%2C9.28111"
    );
    expect(
      screen.getByRole("link", { name: /jules roy \/ f1 circuits svg/i })
    ).toHaveAttribute("href", expect.stringContaining("monza-7.svg"));
    expect(getCircuitPoleSitters).toHaveBeenCalledWith("monza");
    expect(getCircuitPodiumFinishers).toHaveBeenCalledWith("monza");
    expect(screen.getByRole("link", { name: "Reference" })).toHaveAttribute(
      "href",
      "https://example.com/monza"
    );

    const calendarList = screen.getByRole("list", {
      name: /2026 races at autodromo nazionale di monza/i,
    });
    const raceCard = within(calendarList).getByRole("listitem");
    expect(
      within(raceCard).getByText("Italian Grand Prix")
    ).toBeInTheDocument();
    expect(
      within(raceCard).getByRole("link", { name: /view race details/i })
    ).toHaveAttribute("href", "/race/16?season=2026");
  });

  it("renders previous winners for historical circuit context", async () => {
    getCircuit.mockResolvedValue(SAMPLE_CIRCUIT);
    getCurrentSeasonRaces.mockResolvedValue(SAMPLE_RACES);
    getCircuitPoleSitters.mockResolvedValue(SAMPLE_POLE_SITTERS);
    getCircuitRaceWinners.mockResolvedValue(SAMPLE_WINNERS);
    await renderCircuitProfile();

    expect(
      await screen.findByRole("heading", { name: /previous winners/i })
    ).toBeInTheDocument();
    expect(getCircuitRaceWinners).toHaveBeenCalledWith("monza");

    const winnersList = screen.getByRole("list", {
      name: /previous winners at autodromo nazionale di monza/i,
    });
    const winnerCards = within(winnersList).getAllByRole("listitem");
    expect(within(winnerCards[0]).getByText("2025 winner")).toBeInTheDocument();
    expect(
      within(winnerCards[0]).getByText("Charles Leclerc")
    ).toBeInTheDocument();
    expect(within(winnerCards[0]).getByText("Ferrari")).toBeInTheDocument();
    expect(
      within(winnerCards[0]).getByRole("link", { name: /driver profile/i })
    ).toHaveAttribute("href", "/driver/leclerc?season=2025");
    expect(
      within(winnerCards[0]).getByRole("link", { name: /race result/i })
    ).toHaveAttribute("href", "/race/16?season=2025");
  });

  it("marks the circuit as a favorite and persists the selection", async () => {
    getCircuit.mockResolvedValue(SAMPLE_CIRCUIT);
    getCurrentSeasonRaces.mockResolvedValue(SAMPLE_RACES);
    await renderCircuitProfile();

    const favoriteButton = await screen.findByRole("button", {
      name: "Mark Autodromo Nazionale di Monza as favorite",
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(favoriteButton);

    expect(
      screen.getByRole("button", {
        name: "Remove Autodromo Nazionale di Monza from favorite circuits",
      })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      JSON.parse(window.localStorage.getItem(favoriteCircuitsStorageKey)!)
    ).toEqual(["monza"]);
  });

  it("restores and removes a persisted favorite circuit", async () => {
    window.localStorage.setItem(
      favoriteCircuitsStorageKey,
      JSON.stringify(["monza"])
    );
    getCircuit.mockResolvedValue(SAMPLE_CIRCUIT);
    getCurrentSeasonRaces.mockResolvedValue(SAMPLE_RACES);
    await renderCircuitProfile();

    const favoriteButton = await screen.findByRole("button", {
      name: "Remove Autodromo Nazionale di Monza from favorite circuits",
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(favoriteButton);

    expect(
      screen.getByRole("button", {
        name: "Mark Autodromo Nazionale di Monza as favorite",
      })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      JSON.parse(window.localStorage.getItem(favoriteCircuitsStorageKey)!)
    ).toEqual([]);
  });

  it("shows an empty state when the circuit cannot be found", async () => {
    getCircuit.mockResolvedValue(null);
    getCurrentSeasonRaces.mockResolvedValue([]);
    await renderCircuitProfile("/circuit/unknown?season=2026");

    expect(
      await screen.findByRole("heading", {
        name: /circuit profile unavailable/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/unknown/)).toBeInTheDocument();
  });
});
