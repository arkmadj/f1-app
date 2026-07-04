import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import RaceResultsPage from "./RaceResultsPage";
import { renderWithRouter } from "../../test-utils/router";
import {
  getCurrentSeasonRaces,
  getRacePitStops,
  getRaceLapTimings,
  getRaceResults,
  getRaceStewardInvestigations,
  getSprintResults,
} from "../../services/api/racesApi";
import { getOfficialF1RaceHighlightsUrl } from "../../services/api/highlightsApi";

// Mock the API service so each test can drive the underlying useQuery
// state (loading / success / error) deterministically without touching
// the network.
vi.mock("../../services/api/racesApi", () => ({
  getCurrentSeasonRaces: vi.fn(),
  getRacePitStops: vi.fn(),
  getRaceLapTimings: vi.fn(),
  getRaceResults: vi.fn(),
  getRaceStewardInvestigations: vi.fn(),
  getSprintResults: vi.fn(),
}));

vi.mock("../../services/api/highlightsApi", () => ({
  getOfficialF1RaceHighlightsUrl: vi.fn(),
}));

// The Loader pulls in react-loader-spinner which renders SVG animations
// we don't care about here; a sentinel keeps the loading-state assertions
// trivial.
vi.mock("../../components/Loader/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));

const buildResult = ({
  position,
  grid = position,
  driverId,
  code,
  constructorName = "Red Bull",
  permanentNumber,
  time,
  status,
  points,
  fastestLapRank,
  fastestLapLap,
  fastestLapTime,
}) => ({
  position,
  grid,
  points,
  status,
  Time: time ? { time } : undefined,
  FastestLap: fastestLapTime
    ? {
        rank: fastestLapRank,
        lap: fastestLapLap,
        Time: { time: fastestLapTime },
      }
    : undefined,
  Driver: { driverId, code, permanentNumber },
  Constructor: {
    constructorId: `${code.toLowerCase()}_team`,
    name: constructorName,
  },
  laps: "57",
});

const SAMPLE_RESULTS = [
  buildResult({
    position: "1",
    grid: "3",
    driverId: "max_verstappen",
    code: "VER",
    permanentNumber: "1",
    time: "1:30:00.000",
    points: "25",
    fastestLapRank: "2",
    fastestLapLap: "51",
    fastestLapTime: "1:20.500",
  }),
  buildResult({
    position: "2",
    grid: "1",
    driverId: "leclerc",
    code: "LEC",
    permanentNumber: "16",
    time: "+5.123",
    points: "18",
    fastestLapRank: "1",
    fastestLapLap: "54",
    fastestLapTime: "1:20.300", // overall fastest
  }),
  buildResult({
    position: "3",
    grid: "5",
    driverId: "norris",
    code: "NOR",
    permanentNumber: "4",
    status: "DNF",
    points: "0",
  }),
];

const SAMPLE_RACES = [
  {
    season: "2024",
    round: "5",
    raceName: "Miami Grand Prix",
    date: "2024-05-05",
    time: "20:00:00Z",
    Circuit: {
      circuitId: "miami",
      circuitName: "Miami International Autodrome",
      Location: {
        locality: "Miami",
        country: "USA",
      },
    },
  },
];

const SAMPLE_PIT_STOPS = [
  {
    driverId: "max_verstappen",
    lap: "18",
    stop: "1",
    duration: "2.531",
  },
  {
    driverId: "max_verstappen",
    lap: "42",
    stop: "2",
    duration: "2.874",
  },
  {
    driverId: "leclerc",
    lap: "21",
    stop: "1",
    duration: "2.145",
  },
];

const SAMPLE_STEWARD_INVESTIGATIONS = [
  {
    id: "miami-investigation-1",
    date: "2024-05-05T20:52:16+00:00",
    lapNumber: 31,
    driverNumber: null,
    category: "Other",
    message:
      "FIA STEWARDS: TURN 3 INCIDENT INVOLVING CARS 20 (MAG) AND 2 (SAR) UNDER INVESTIGATION - CAUSING A COLLISION",
    status: "under-investigation",
  },
  {
    id: "miami-investigation-2",
    date: "2024-05-05T21:02:21+00:00",
    lapNumber: 37,
    driverNumber: null,
    category: "Other",
    message:
      "FIA STEWARDS: TURN 11 INCIDENT INVOLVING CARS 81 (PIA) AND 55 (SAI) REVIEWED NO FURTHER INVESTIGATION - FORCING ANOTHER DRIVER OFF THE TRACK",
    status: "no-further-action",
  },
];

const SAMPLE_TIME_PENALTIES = [
  {
    id: "miami-penalty-1",
    date: "2024-05-05T20:11:00+00:00",
    lapNumber: 1,
    driverNumber: 1,
    category: "Other",
    message:
      "FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 1 (VER) - LEAVING THE TRACK AND GAINING AN ADVANTAGE",
    status: "penalty",
  },
  {
    id: "miami-penalty-2",
    date: "2024-05-05T20:42:00+00:00",
    lapNumber: 20,
    driverNumber: 1,
    category: "Other",
    message:
      "FIA STEWARDS: PENALTY SERVED - 5 SECOND TIME PENALTY FOR CAR 1 (VER)",
    status: "penalty",
  },
];

const SAMPLE_LAP_TIMINGS = [
  {
    number: "1",
    Timings: [
      { driverId: "max_verstappen", position: "1" },
      { driverId: "leclerc", position: "2" },
      { driverId: "norris", position: "3" },
    ],
  },
  {
    number: "2",
    Timings: [
      { driverId: "max_verstappen", position: "2" },
      { driverId: "leclerc", position: "1" },
      { driverId: "norris", position: "3" },
    ],
  },
  {
    number: "3",
    Timings: [
      { driverId: "max_verstappen", position: "1" },
      { driverId: "leclerc", position: "2" },
      { driverId: "norris", position: "3" },
    ],
  },
];

const SORTABLE_RESULTS = [
  buildResult({
    position: "1",
    driverId: "max_verstappen",
    code: "VER",
    time: "1:30:00.000",
    points: "25",
    fastestLapRank: "2",
    fastestLapLap: "51",
    fastestLapTime: "1:20.300",
  }),
  buildResult({
    position: "2",
    driverId: "leclerc",
    code: "LEC",
    time: "+5.123",
    points: "18",
    fastestLapRank: "3",
    fastestLapLap: "54",
    fastestLapTime: "1:20.500",
  }),
  buildResult({
    position: "3",
    driverId: "norris",
    code: "NOR",
    time: "+8.456",
    points: "15",
    fastestLapRank: "1",
    fastestLapLap: "53",
    fastestLapTime: "1:19.900",
  }),
  buildResult({
    position: "4",
    driverId: "sainz",
    code: "SAI",
    status: "DNF",
    points: "0",
  }),
];

const SORTABLE_PIT_STOPS = [
  {
    driverId: "max_verstappen",
    lap: "20",
    stop: "1",
    duration: "2.801",
  },
  {
    driverId: "max_verstappen",
    lap: "44",
    stop: "2",
    duration: "2.200",
  },
  {
    driverId: "leclerc",
    lap: "22",
    stop: "1",
    duration: "2.500",
  },
  {
    driverId: "norris",
    lap: "19",
    stop: "1",
    duration: "2.900",
  },
  {
    driverId: "norris",
    lap: "40",
    stop: "2",
    duration: "2.300",
  },
];

const renderAtRound = async (round = "5") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: `/race/${round}`,
    routes: [
      { path: "/race/$race", element: <RaceResultsPage /> },
      {
        path: "/race/$race/driver/$driver",
        element: <div data-testid="driver-race-details-page" />,
      },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
      { path: "/circuit/$id", element: <div data-testid="circuit-page" /> },
      {
        path: "/qualifying/$round",
        element: <div data-testid="qualifying-page" />,
      },
      { path: "/sprint/$round", element: <div data-testid="sprint-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

const getDisplayedDrivers = (): string[] =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getByRole("link").textContent?.trim() ?? "");

const createObjectURLMock = vi.fn(() => "blob:race-results");
const revokeObjectURLMock = vi.fn();
const anchorClickMock = vi.fn();

describe("RaceResultsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    getOfficialF1RaceHighlightsUrl.mockReset();
    getCurrentSeasonRaces.mockReset();
    getRacePitStops.mockReset();
    getRaceLapTimings.mockReset();
    getRaceResults.mockReset();
    getRaceStewardInvestigations.mockReset();
    getSprintResults.mockReset();
    getOfficialF1RaceHighlightsUrl.mockResolvedValue(
      "https://www.youtube.com/watch?v=9wiQqcKUahc"
    );
    getCurrentSeasonRaces.mockResolvedValue(SAMPLE_RACES);
    getRacePitStops.mockResolvedValue([]);
    getRaceLapTimings.mockResolvedValue([]);
    getRaceStewardInvestigations.mockResolvedValue([]);
    // Sprint defaults to empty so tests that don't care about it still
    // render a deterministic UI without the sprint button.
    getSprintResults.mockResolvedValue([]);
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

  it("renders the loader while the race results query is pending", async () => {
    getRaceResults.mockReturnValue(new Promise(() => {}));
    await renderAtRound("5");
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("logs and renders the error message when the race results query fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("network down");
    getRaceResults.mockRejectedValue(failure);

    await renderAtRound("5");

    expect(
      await screen.findByText("Error: This Grand Prix has not taken place")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching race results:",
        failure
      )
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the heading with the round from the URL", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("7");
    expect(
      await screen.findByRole("heading", {
        name: "Race Results - 2024 Round 7",
      })
    ).toBeInTheDocument();
  });

  it("renders the table column headers", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    await screen.findByRole("link", { name: /VER/ });
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.replace(/[↕▲▼]/g, ""));
    expect(headers).toEqual([
      "Position",
      "Driver",
      "Constructor",
      "Time / Status",
      "Fastest lap",
      "Tire strategy",
      "Fastest pit stop",
      "Points",
    ]);
  });

  it("sorts the race results by fastest lap time when the header is clicked", async () => {
    getRaceResults.mockResolvedValue(SORTABLE_RESULTS);
    await renderAtRound("5");

    await screen.findByRole("link", { name: /VER/ });
    const fastestLapHeader = screen.getByRole("columnheader", {
      name: /fastest lap/i,
    });
    const sortButton = within(fastestLapHeader).getByRole("button");

    expect(fastestLapHeader).toHaveAttribute("aria-sort", "none");
    expect(getDisplayedDrivers()).toEqual(["VER", "LEC", "NOR", "SAI"]);

    fireEvent.click(sortButton);
    expect(fastestLapHeader).toHaveAttribute("aria-sort", "ascending");
    expect(getDisplayedDrivers()).toEqual(["NOR", "VER", "LEC", "SAI"]);

    fireEvent.click(sortButton);
    expect(fastestLapHeader).toHaveAttribute("aria-sort", "descending");
    expect(getDisplayedDrivers()).toEqual(["LEC", "VER", "NOR", "SAI"]);

    fireEvent.click(sortButton);
    expect(fastestLapHeader).toHaveAttribute("aria-sort", "none");
    expect(getDisplayedDrivers()).toEqual(["VER", "LEC", "NOR", "SAI"]);
  });

  it("sorts the race results by fastest pit stop time when the header is clicked", async () => {
    getRaceResults.mockResolvedValue(SORTABLE_RESULTS);
    getRacePitStops.mockResolvedValue(SORTABLE_PIT_STOPS);
    await renderAtRound("5");

    await screen.findByRole("link", { name: /VER/ });
    const fastestLapHeader = screen.getByRole("columnheader", {
      name: /fastest lap/i,
    });
    const fastestPitStopHeader = screen.getByRole("columnheader", {
      name: /fastest pit stop/i,
    });
    const sortButton = within(fastestPitStopHeader).getByRole("button");

    expect(fastestLapHeader).toHaveAttribute("aria-sort", "none");
    expect(fastestPitStopHeader).toHaveAttribute("aria-sort", "none");
    expect(getDisplayedDrivers()).toEqual(["VER", "LEC", "NOR", "SAI"]);

    fireEvent.click(sortButton);
    expect(fastestLapHeader).toHaveAttribute("aria-sort", "none");
    expect(fastestPitStopHeader).toHaveAttribute("aria-sort", "ascending");
    expect(getDisplayedDrivers()).toEqual(["VER", "NOR", "LEC", "SAI"]);

    fireEvent.click(sortButton);
    expect(fastestPitStopHeader).toHaveAttribute("aria-sort", "descending");
    expect(getDisplayedDrivers()).toEqual(["LEC", "NOR", "VER", "SAI"]);

    fireEvent.click(sortButton);
    expect(fastestPitStopHeader).toHaveAttribute("aria-sort", "none");
    expect(getDisplayedDrivers()).toEqual(["VER", "LEC", "NOR", "SAI"]);
  });

  it("renders a race overview panel with context and highlights", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    const overview = await screen.findByRole("region", {
      name: /race overview/i,
    });
    expect(
      within(overview).getByRole("heading", { name: "Miami Grand Prix" })
    ).toBeInTheDocument();
    expect(
      within(overview).getByText("Miami International Autodrome")
    ).toBeInTheDocument();
    expect(
      within(overview).getByRole("link", {
        name: "Miami International Autodrome",
      })
    ).toHaveAttribute("href", "/circuit/miami");
    expect(within(overview).getByText("Miami, USA")).toBeInTheDocument();
    expect(within(overview).getByText("VER · Red Bull")).toBeInTheDocument();
    expect(within(overview).getByText("LEC · 1:20.300")).toBeInTheDocument();
    expect(within(overview).getByText("VER / LEC / NOR")).toBeInTheDocument();
    expect(within(overview).getByText("2 classified of 3")).toBeInTheDocument();
  });

  it("renders steward investigations associated with the race", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRaceStewardInvestigations.mockResolvedValue(SAMPLE_STEWARD_INVESTIGATIONS);

    await renderAtRound("5");

    const investigations = await screen.findByRole("region", {
      name: /steward investigations/i,
    });

    expect(within(investigations).getByText("2 records")).toBeInTheDocument();
    expect(within(investigations).getByText("Under investigation")).toBeInTheDocument();
    expect(within(investigations).getByText("No further action")).toBeInTheDocument();
    expect(within(investigations).getByText("Lap 31")).toBeInTheDocument();
    expect(
      within(investigations).getByText(/turn 3 incident involving cars 20/i)
    ).toBeInTheDocument();
  });

  it("renders a time penalties section with classification-impact context", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRaceStewardInvestigations.mockResolvedValue(SAMPLE_TIME_PENALTIES);

    await renderAtRound("5");

    const penalties = await screen.findByRole("region", {
      name: /time penalties/i,
    });

    expect(within(penalties).getByText("2 adjustments")).toBeInTheDocument();
    expect(within(penalties).getAllByText("VER")).not.toHaveLength(0);
    expect(within(penalties).getAllByText("5s")).toHaveLength(2);
    expect(within(penalties).getByText("Penalty issued")).toBeInTheDocument();
    expect(within(penalties).getByText("Penalty served")).toBeInTheDocument();
    expect(within(penalties).getAllByText("Final P1")).toHaveLength(2);
    expect(within(penalties).getAllByText("Grid P3 → Finish P1")).toHaveLength(
      2
    );
    expect(
      within(penalties).getAllByText(/5 second time penalty for car 1/i)
    ).toHaveLength(2);
  });

  it("renders a line chart of position changes by lap", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRaceLapTimings.mockResolvedValue(SAMPLE_LAP_TIMINGS);
    await renderAtRound("5");

    const chart = await screen.findByRole("region", {
      name: /position changes by lap/i,
    });
    expect(
      within(chart).getByRole("img", {
        name: /position changes by lap for miami grand prix/i,
      })
    ).toBeInTheDocument();
    expect(within(chart).getByText("3 drivers · Laps 1-3")).toBeInTheDocument();
    expect(within(chart).getByText("Lap 1")).toBeInTheDocument();
    expect(within(chart).getByText("Lap 3")).toBeInTheDocument();
    expect(within(chart).getByText("VER")).toBeInTheDocument();
    expect(within(chart).getAllByText("P1").length).toBeGreaterThan(0);
  });

  it("renders an interactive race timeline and updates the selected moment", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    getRaceLapTimings.mockResolvedValue(SAMPLE_LAP_TIMINGS);
    await renderAtRound("5");

    const timeline = await screen.findByRole("region", {
      name: /race timeline/i,
    });
    const chart = await screen.findByRole("region", {
      name: /position changes by lap/i,
    });
    const startTab = within(timeline).getByRole("tab", {
      name: /lap 1.*start.*ver/i,
    });
    const leadChangeTab = within(timeline).getByRole("tab", {
      name: /lap 2.*lead change.*lec/i,
    });

    expect(startTab).toHaveAttribute("aria-selected", "true");
    expect(
      within(timeline).getByText("VER steals the lead at lights out")
    ).toBeInTheDocument();
    expect(within(timeline).getByText("Started P3")).toBeInTheDocument();
    expect(
      within(timeline).getByText(
        /selecting a moment highlights the related driver trace in the lap chart below/i
      )
    ).toBeInTheDocument();
    expect(within(chart).getByText("Focus · VER")).toBeInTheDocument();

    fireEvent.click(leadChangeTab);

    await waitFor(() => {
      expect(leadChangeTab).toHaveAttribute("aria-selected", "true");
    });
    expect(within(timeline).getByText("LEC takes P1")).toBeInTheDocument();
    expect(within(timeline).getByText("VER → LEC")).toBeInTheDocument();
    expect(within(chart).getByText("Focus · LEC")).toBeInTheDocument();
  });

  it("shows an unavailable state when lap timing data is missing", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRaceLapTimings.mockResolvedValue([]);
    await renderAtRound("5");

    const chart = await screen.findByRole("region", {
      name: /position changes by lap/i,
    });
    expect(
      within(chart).getByText(
        "Lap-by-lap position data is unavailable for this race."
      )
    ).toBeInTheDocument();
  });

  it("renders one row per result with position, driver, constructor, time, fastest lap, tire strategy, fastest pit stop and points", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    await renderAtRound("5");

    await screen.findByRole("link", { name: /VER/ });
    // 1 header row + 3 data rows.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);

    const verRow = rows[1];
    expect(within(verRow).getByText("1")).toBeInTheDocument();
    expect(within(verRow).getByText("Grid P3 → Finish P1")).toBeInTheDocument();
    expect(within(verRow).getByText("VER")).toBeInTheDocument();
    expect(within(verRow).getByText("Red Bull")).toBeInTheDocument();
    expect(within(verRow).getByText("1:30:00.000")).toBeInTheDocument();
    expect(within(verRow).getByText("1:20.500")).toBeInTheDocument();
    expect(within(verRow).getByText("Rank 2 · Lap 51")).toBeInTheDocument();
    expect(within(verRow).getByText("2 stops")).toBeInTheDocument();
    expect(within(verRow).getByText("Laps 18 / 42")).toBeInTheDocument();
    expect(within(verRow).getByText("2.531s")).toBeInTheDocument();
    expect(within(verRow).getByText("Lap 18 · Stop 1")).toBeInTheDocument();
    expect(within(verRow).getByText("25")).toBeInTheDocument();

    const lecRow = rows[2];
    expect(within(lecRow).getByText("Grid P1 → Finish P2")).toBeInTheDocument();
    expect(within(lecRow).getByText("LEC")).toBeInTheDocument();
    expect(within(lecRow).getByText("+5.123")).toBeInTheDocument();
    expect(within(lecRow).getByText("1:20.300")).toBeInTheDocument();
    expect(within(lecRow).getByText("Rank 1 · Lap 54")).toBeInTheDocument();
    expect(within(lecRow).getByText("1 stop")).toBeInTheDocument();
    expect(within(lecRow).getByText("Laps 21")).toBeInTheDocument();
    expect(within(lecRow).getByText("2.145s")).toBeInTheDocument();
    expect(within(lecRow).getByText("18")).toBeInTheDocument();

    const norRow = rows[3];
    expect(within(norRow).getByText("Grid P5 → Finish P3")).toBeInTheDocument();
    expect(within(norRow).getByText("No stops")).toBeInTheDocument();
    expect(
      within(norRow).getByText("Strategy unavailable")
    ).toBeInTheDocument();
    expect(within(norRow).getAllByText("—")).toHaveLength(2);
  });

  it("downloads the current race results table data as a CSV file", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    await renderAtRound("5");

    await screen.findByRole("link", { name: /VER/ });
    const fastestLapHeader = screen.getByRole("columnheader", {
      name: /fastest lap/i,
    });
    fireEvent.click(within(fastestLapHeader).getByRole("button"));

    fireEvent.click(
      screen.getByRole("button", {
        name: /download race results table data for miami grand prix/i,
      })
    );

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv.split("\n")).toEqual([
      "Position,Driver,Constructor,Time / Status,Fastest lap,Tire strategy,Fastest pit stop,Points",
      "2,LEC,Red Bull,+5.123,1:20.300 (Rank 1 · Lap 54),1 stop (Laps 21),2.145s (Lap 21 · Stop 1),18",
      "1,VER,Red Bull,1:30:00.000,1:20.500 (Rank 2 · Lap 51),2 stops (Laps 18 / 42),2.531s (Lap 18 · Stop 1),25",
      "3,NOR,Red Bull,DNF,—,No stops (Strategy unavailable),—,0",
    ]);
    expect(anchorClickMock).toHaveBeenCalledWith(
      "blob:race-results",
      "2024-round-5-miami-grand-prix-results.csv"
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:race-results");
  });

  it("falls back to status when Time is missing", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");
    expect(await screen.findByText("DNF")).toBeInTheDocument();
  });

  it("links each driver name to the driver profile route", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
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

  it("opens driver race details when a result row is clicked", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    const { router } = await renderAtRound("5");

    const verRow = (await screen.findByRole("link", { name: /VER/ })).closest(
      "tr"
    );
    expect(verRow).not.toBeNull();
    fireEvent.click(verRow as HTMLTableRowElement);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        "/race/5/driver/max_verstappen"
      );
    });
    expect(
      await screen.findByTestId("driver-race-details-page")
    ).toBeInTheDocument();
  });

  it("highlights the driver with the overall fastest lap", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
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
    getRaceResults.mockResolvedValue(noFastest);
    await renderAtRound("5");

    await screen.findByRole("link", { name: /VER/ });
    // With no fastest lap times, none of the rows should be marked as fastest.
    expect(screen.getByRole("link", { name: /VER/ })).not.toHaveClass(
      "fastest-lap"
    );
    expect(screen.getByRole("link", { name: /LEC/ })).not.toHaveClass(
      "fastest-lap"
    );
  });

  it("always renders a link to the qualifying page for the round", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("9");

    const qualyLink = await screen.findByRole("link", { name: /view qualy/i });
    expect(qualyLink).toHaveAttribute("href", "/qualifying/9");
  });

  it("renders a Watch Highlights button linking to the official F1 YouTube video", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    const highlightsLink = await screen.findByRole("link", {
      name: /watch highlights/i,
    });
    expect(highlightsLink).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=9wiQqcKUahc"
    );
    expect(highlightsLink).toHaveAttribute("target", "_blank");
  });

  it("renders the sprint button when sprint results are available", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getSprintResults.mockResolvedValue([{ position: "1" }]);
    await renderAtRound("3");

    const sprintLink = await screen.findByRole("link", {
      name: /view sprint results/i,
    });
    expect(sprintLink).toHaveAttribute("href", "/sprint/3");
  });

  it("hides the sprint button when sprint results are empty", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getSprintResults.mockResolvedValue([]);
    await renderAtRound("3");

    await screen.findByRole("link", { name: /VER/ });
    expect(
      screen.queryByRole("link", { name: /view sprint results/i })
    ).not.toBeInTheDocument();
  });

  it("hides the sprint button when the sprint query returns a non-array payload", async () => {
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getSprintResults.mockResolvedValue(null);
    await renderAtRound("3");

    await screen.findByRole("link", { name: /VER/ });
    expect(
      screen.queryByRole("link", { name: /view sprint results/i })
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when results is an empty array", async () => {
    getRaceResults.mockResolvedValue([]);
    await renderAtRound("5");

    await screen.findByRole("heading", {
      name: "Race Results - 2024 Round 5",
    });
    expect(
      screen.getByRole("heading", { name: /no race results available/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders translated race results content in Spanish", async () => {
    await i18n.changeLanguage("es");
    getRaceResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    getRaceLapTimings.mockResolvedValue(SAMPLE_LAP_TIMINGS);
    getRaceStewardInvestigations.mockResolvedValue(SAMPLE_STEWARD_INVESTIGATIONS);
    getSprintResults.mockResolvedValue([{ position: "1" }]);

    await renderAtRound("5");

    expect(
      await screen.findByRole("heading", {
        name: "Resultados de carrera - 2024 ronda 5",
      })
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Resultados de carrera"));
    expect(
      screen.getByRole("link", { name: "Ver highlights" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver clasificación" })
    ).toHaveAttribute("href", "/qualifying/5");
    expect(
      screen.getByRole("link", { name: "Ver resultados sprint" })
    ).toHaveAttribute("href", "/sprint/5");
    expect(
      screen.getByRole("region", { name: "Resumen de carrera" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Investigaciones de los comisarios",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Cronología de la carrera" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Cambios de posición por vuelta" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Descargar los datos de la tabla de resultados de carrera de Miami Grand Prix",
      })
    ).toBeInTheDocument();

    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[↕▲▼]/g, ""));
    expect(headers).toEqual([
      "Posición",
      "Piloto",
      "Constructor",
      "Tiempo / Estado",
      "Vuelta rápida",
      "Estrategia de neumáticos",
      "Parada más rápida",
      "Puntos",
    ]);
    expect(screen.getAllByText("ptos").length).toBeGreaterThan(0);
    expect(screen.getByText("3 pilotos · Vueltas 1-3")).toBeInTheDocument();
    expect(screen.getByText("Foco · VER")).toBeInTheDocument();
  });
});
