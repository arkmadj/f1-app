import { screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SprintResultsPage from "./SprintResultPage";
import i18n from "../../app/i18n";
import { renderWithRouter } from "../../test-utils/router";
import { getSprintResults } from "../../services/api/racesApi";

// Mock the API service so each test can drive the underlying useQuery
// state (loading / success / error) deterministically without touching
// the network.
vi.mock("../../services/api/racesApi", () => ({
  getSprintResults: vi.fn(),
}));

const buildResult = ({
  position,
  driverId,
  code,
  time,
  status,
  points,
  fastestLapTime,
}) => ({
  position,
  points,
  status,
  Time: time ? { time } : undefined,
  FastestLap: fastestLapTime ? { Time: { time: fastestLapTime } } : undefined,
  Driver: { driverId, code },
});

const SAMPLE_RESULTS = [
  buildResult({
    position: "1",
    driverId: "max_verstappen",
    code: "VER",
    time: "30:00.000",
    points: "8",
    fastestLapTime: "1:20.500",
  }),
  buildResult({
    position: "2",
    driverId: "leclerc",
    code: "LEC",
    time: "+5.123",
    points: "7",
    fastestLapTime: "1:20.300", // overall fastest
  }),
  buildResult({
    position: "3",
    driverId: "norris",
    code: "NOR",
    status: "DNF",
    points: "0",
  }),
];

const renderAtRound = async (round = "5") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: `/sprint/${round}`,
    routes: [
      { path: "/sprint/$round", element: <SprintResultsPage /> },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("SprintResultsPage", () => {
  beforeEach(() => {
    getSprintResults.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the sprint results skeleton while the query is pending", async () => {
    getSprintResults.mockReturnValue(new Promise(() => {}));
    await renderAtRound("5");

    expect(
      screen.getByTestId("sprint-results-page-skeleton")
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading sprint results for 2024 round 5"
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("logs and renders the error message when the query fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("network down");
    getSprintResults.mockRejectedValue(failure);

    await renderAtRound("5");

    expect(await screen.findByText("Error: network down")).toBeInTheDocument();
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching sprint results:",
        failure
      )
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the empty-state message when the API returns an empty array", async () => {
    getSprintResults.mockResolvedValue([]);
    await renderAtRound("5");

    expect(
      await screen.findByRole("heading", {
        name: /no sprint results available/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the empty-state message when the API returns a non-array payload", async () => {
    getSprintResults.mockResolvedValue(null);
    await renderAtRound("5");

    expect(
      await screen.findByRole("heading", {
        name: /no sprint results available/i,
      })
    ).toBeInTheDocument();
  });

  it("renders the heading with the round from the URL", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("7");
    expect(
      await screen.findByRole("heading", {
        name: "Sprint Race Results - 2024 Round 7",
      })
    ).toBeInTheDocument();
  });

  it("renders the four expected column headers", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    await screen.findByText("VER");
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).toEqual(["Position", "Driver", "Time", "Points"]);
  });

  it("renders one row per result with position, driver code and points", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    await screen.findByText("VER");
    // 1 header row + 3 data rows.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);

    const verRow = rows[1];
    expect(within(verRow).getByText("1")).toBeInTheDocument();
    expect(within(verRow).getByText("VER")).toBeInTheDocument();
    expect(within(verRow).getByText("8")).toBeInTheDocument();

    const lecRow = rows[2];
    expect(within(lecRow).getByText("LEC")).toBeInTheDocument();
    expect(within(lecRow).getByText("+5.123")).toBeInTheDocument();
    expect(within(lecRow).getByText("7")).toBeInTheDocument();
  });

  it("uses the FastestLap time for the leader row's Time column", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    await screen.findByText("VER");
    const verRow = screen.getAllByRole("row")[1];
    // Leader is shown with their fastest-lap time, not the race time.
    expect(within(verRow).getByText("1:20.500")).toBeInTheDocument();
    expect(within(verRow).queryByText("30:00.000")).not.toBeInTheDocument();
  });

  it("shows 'N/A' for the leader when no FastestLap is recorded", async () => {
    const [first, ...rest] = SAMPLE_RESULTS;
    getSprintResults.mockResolvedValue([
      { ...first, FastestLap: undefined },
      ...rest,
    ]);
    await renderAtRound("5");

    await screen.findByText("VER");
    const verRow = screen.getAllByRole("row")[1];
    expect(within(verRow).getByText("N/A")).toBeInTheDocument();
  });

  it("falls back to status when a non-leader row has no Time", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");
    expect(await screen.findByText("DNF")).toBeInTheDocument();
  });

  it("links each driver name to the driver profile route", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    expect(await screen.findByRole("link", { name: /VER/ })).toHaveAttribute(
      "href",
      "/driver/max_verstappen"
    );
    expect(screen.getByRole("link", { name: /LEC/ })).toHaveAttribute(
      "href",
      "/driver/leclerc"
    );
    expect(screen.getByRole("link", { name: /NOR/ })).toHaveAttribute(
      "href",
      "/driver/norris"
    );
  });

  it("highlights the driver with the overall fastest lap", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    // LEC has the lowest FastestLap.Time.time among the sample.
    const fastest = await screen.findByRole("link", { name: /LEC/ });
    expect(fastest).toHaveClass("fastest-lap");
    expect(screen.getByRole("link", { name: /VER/ })).not.toHaveClass(
      "fastest-lap"
    );
    expect(screen.getByRole("link", { name: /NOR/ })).not.toHaveClass(
      "fastest-lap"
    );
  });

  it("does not crash when no driver has a fastest lap recorded", async () => {
    const noFastest = SAMPLE_RESULTS.map((r) => ({
      ...r,
      FastestLap: undefined,
    }));
    getSprintResults.mockResolvedValue(noFastest);
    await renderAtRound("5");

    // Page still renders the results table without throwing.
    await screen.findByText("VER");
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("calls the API with the round from the URL", async () => {
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("9");

    await screen.findByRole("heading", {
      name: "Sprint Race Results - 2024 Round 9",
    });
    expect(getSprintResults).toHaveBeenCalledWith("9", "2024");
  });

  it("renders translated sprint results copy after switching to Spanish", async () => {
    await i18n.changeLanguage("es");
    getSprintResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("7");

    expect(
      await screen.findByRole("heading", {
        name: "Resultados de la carrera sprint - 2024 ronda 7",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Clasificación sprint")).toBeInTheDocument();
    expect(screen.getByText("Tabla de resultados")).toBeInTheDocument();
    expect(screen.getByText("3 resultados listados")).toBeInTheDocument();
    expect(screen.getByText("Vuelta rápida: LEC")).toBeInTheDocument();
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["Posición", "Piloto", "Tiempo", "Puntos"]);
  });
});
