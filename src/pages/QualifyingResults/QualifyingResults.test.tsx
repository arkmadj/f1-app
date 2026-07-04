import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QualifyingResultsPage from "./QualifyingResults";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";
import {
  getQualifyingResults,
  getRacePitStops,
} from "../../services/api/racesApi";

vi.mock("../../services/api/racesApi", () => ({
  getQualifyingResults: vi.fn(),
  getRacePitStops: vi.fn(),
}));

const buildResult = ({
  position,
  driverId,
  code,
  permanentNumber,
  givenName,
  familyName,
  constructorName,
  q1,
  q2,
  q3,
}) => ({
  position,
  Driver: { driverId, code, permanentNumber, givenName, familyName },
  Constructor: {
    constructorId: constructorName.toLowerCase(),
    name: constructorName,
  },
  Q1: q1,
  Q2: q2,
  Q3: q3,
});

const SAMPLE_RESULTS = [
  buildResult({
    position: "1",
    driverId: "max_verstappen",
    code: "VER",
    givenName: "Max",
    familyName: "Verstappen",
    constructorName: "Red Bull",
    q1: "1:29.179",
    q2: "1:28.740",
    q3: "1:28.197",
  }),
  buildResult({
    position: "2",
    driverId: "charles_leclerc",
    code: "LEC",
    givenName: "Charles",
    familyName: "Leclerc",
    constructorName: "Ferrari",
    q1: "1:29.165",
    q2: "1:28.884",
    q3: "1:28.786",
  }),
  buildResult({
    position: "20",
    driverId: "logan_sargeant",
    code: "SAR",
    givenName: "Logan",
    familyName: "Sargeant",
    constructorName: "Williams",
    q1: "1:31.652",
  }),
];

const SORTABLE_RESULTS = [
  buildResult({
    position: "1",
    driverId: "max_verstappen",
    code: "VER",
    givenName: "Max",
    familyName: "Verstappen",
    constructorName: "Red Bull",
    q1: "1:29.200",
    q2: "1:28.900",
    q3: "1:28.500",
  }),
  buildResult({
    position: "2",
    driverId: "charles_leclerc",
    code: "LEC",
    givenName: "Charles",
    familyName: "Leclerc",
    constructorName: "Ferrari",
    q1: "1:29.100",
    q2: "1:29.000",
    q3: "1:28.300",
  }),
  buildResult({
    position: "3",
    driverId: "lando_norris",
    code: "NOR",
    givenName: "Lando",
    familyName: "Norris",
    constructorName: "McLaren",
    q1: "1:29.300",
    q2: "1:28.700",
  }),
];

const SAMPLE_PIT_STOPS = [
  {
    driverId: "max_verstappen",
    lap: "18",
    stop: "1",
    compound: "SOFT",
  },
  {
    driverId: "max_verstappen",
    lap: "42",
    stop: "2",
    compound: "MEDIUM",
  },
  {
    driverId: "charles_leclerc",
    lap: "21",
    stop: "1",
    tireCompound: "HARD",
  },
];

const TIMELINE_RESULTS = [
  buildResult({
    position: "1",
    driverId: "lando_norris",
    code: "NOR",
    givenName: "Lando",
    familyName: "Norris",
    constructorName: "McLaren",
    q1: "1:29.050",
    q2: "1:28.640",
    q3: "1:28.100",
  }),
  buildResult({
    position: "2",
    driverId: "charles_leclerc",
    code: "LEC",
    givenName: "Charles",
    familyName: "Leclerc",
    constructorName: "Ferrari",
    q1: "1:29.120",
    q2: "1:28.500",
    q3: "1:28.240",
  }),
  buildResult({
    position: "3",
    driverId: "max_verstappen",
    code: "VER",
    givenName: "Max",
    familyName: "Verstappen",
    constructorName: "Red Bull",
    q1: "1:29.090",
    q2: "1:28.720",
    q3: "1:28.310",
  }),
  buildResult({
    position: "10",
    driverId: "oscar_piastri",
    code: "PIA",
    givenName: "Oscar",
    familyName: "Piastri",
    constructorName: "McLaren",
    q1: "1:29.680",
    q2: "1:29.110",
  }),
  buildResult({
    position: "11",
    driverId: "fernando_alonso",
    code: "ALO",
    givenName: "Fernando",
    familyName: "Alonso",
    constructorName: "Aston Martin",
    q1: "1:29.710",
    q2: "1:29.140",
  }),
  buildResult({
    position: "15",
    driverId: "alex_albon",
    code: "ALB",
    givenName: "Alex",
    familyName: "Albon",
    constructorName: "Williams",
    q1: "1:30.000",
  }),
  buildResult({
    position: "16",
    driverId: "pierre_gasly",
    code: "GAS",
    givenName: "Pierre",
    familyName: "Gasly",
    constructorName: "Alpine F1 Team",
    q1: "1:30.030",
  }),
];

const renderAtRound = async (round = "5") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: `/qualifying/${round}`,
    routes: [
      { path: "/qualifying/$round", element: <QualifyingResultsPage /> },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
      { path: "/race/$race", element: <div data-testid="race-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

const getDisplayedDriverCodes = (): string[] =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getByRole("link").textContent?.slice(0, 3) ?? "");

const createObjectURLMock = vi.fn(() => "blob:qualifying-results");
const revokeObjectURLMock = vi.fn();
const anchorClickMock = vi.fn();

describe("QualifyingResultsPage", () => {
  beforeEach(() => {
    getQualifyingResults.mockReset();
    getRacePitStops.mockReset();
    getRacePitStops.mockResolvedValue([]);
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

  it("renders the qualifying results skeleton while the query is pending", async () => {
    getQualifyingResults.mockReturnValue(new Promise(() => {}));
    await renderAtRound("5");

    expect(
      screen.getByTestId("qualifying-results-page-skeleton")
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading qualifying results"
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("logs and renders the error message when the query fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("network down");
    getQualifyingResults.mockRejectedValue(failure);

    await renderAtRound("5");

    expect(await screen.findByText("Error: network down")).toBeInTheDocument();
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Error fetching qualifying results:",
        failure
      )
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the empty-state message when the API returns an empty array", async () => {
    getQualifyingResults.mockResolvedValue([]);
    await renderAtRound("5");

    expect(
      await screen.findByRole("heading", {
        name: /no qualifying results available/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the empty-state message when the API returns a non-array payload", async () => {
    getQualifyingResults.mockResolvedValue(null);
    await renderAtRound("5");

    expect(
      await screen.findByRole("heading", {
        name: /no qualifying results available/i,
      })
    ).toBeInTheDocument();
  });

  it("renders the enhanced summary and race link", async () => {
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("7");

    expect(
      await screen.findByRole("heading", { name: "Round 7 Qualifying Results" })
    ).toBeInTheDocument();

    const summary = screen.getByLabelText("Qualifying summary");
    expect(within(summary).getByText("Entrants")).toBeInTheDocument();
    expect(within(summary).getByText("3")).toBeInTheDocument();
    expect(within(summary).getByText("Max Verstappen")).toBeInTheDocument();
    expect(within(summary).getByText("1:28.197")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "View Race Results" })
    ).toHaveAttribute("href", "/race/7");
    expect(
      screen.getByRole("heading", { name: "How qualifying unfolded" })
    ).toBeInTheDocument();
  });

  it("renders key qualifying timeline events in chronological order", async () => {
    getQualifyingResults.mockResolvedValue(TIMELINE_RESULTS);

    await renderAtRound("6");

    const timeline = await screen.findByLabelText("Qualifying timeline");
    expect(within(timeline).getByText("5 key moments")).toBeInTheDocument();

    const items = within(timeline).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("Q1");
    expect(items[0]).toHaveTextContent("Lando Norris set the Q1 benchmark");
    expect(items[1]).toHaveTextContent("Q1");
    expect(items[1]).toHaveTextContent("Alex Albon reached Q2 on the bubble");
    expect(items[1]).toHaveTextContent("+0.030s to the cut line");
    expect(items[2]).toHaveTextContent("Q2");
    expect(items[2]).toHaveTextContent("Charles Leclerc set the Q2 benchmark");
    expect(items[3]).toHaveTextContent("Q2");
    expect(items[3]).toHaveTextContent("Oscar Piastri reached Q3 on the bubble");
    expect(items[4]).toHaveTextContent("Q3");
    expect(items[4]).toHaveTextContent("Lando Norris secured pole position");
  });

  it("renders translated Qualifying Results content in Spanish", async () => {
    await i18n.changeLanguage("es");
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);

    await renderAtRound("7");

    expect(
      await screen.findByRole("heading", {
        name: "Resultados de clasificación de la ronda 7",
      })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe("Resultados de clasificación")
    );
    expect(
      screen.getByLabelText("Resumen de clasificación")
    ).toBeInTheDocument();
    expect(screen.getByText("Participantes")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver resultados de carrera" })
    ).toHaveAttribute("href", "/race/7");
    expect(
      screen.getByRole("heading", {
        name: "Cómo se desarrolló la clasificación",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Piloto" })
    ).toBeInTheDocument();
    expect(screen.getByText("Blando → Medio")).toBeInTheDocument();
    expect(screen.getByText("2 paradas · Vueltas 18 / 42")).toBeInTheDocument();
  });

  it("falls back to the first result as pole sitter when position one is absent", async () => {
    const noPoleWinner = [
      buildResult({
        position: "2",
        driverId: "sergio_perez",
        code: "PER",
        givenName: "Sergio",
        familyName: "Perez",
        constructorName: "Red Bull",
        q1: "1:29.300",
        q2: "1:28.990",
      }),
      buildResult({
        position: "3",
        driverId: "lando_norris",
        code: "NOR",
        givenName: "Lando",
        familyName: "Norris",
        constructorName: "McLaren",
        q1: "1:29.410",
      }),
    ];
    getQualifyingResults.mockResolvedValue(noPoleWinner);
    await renderAtRound("8");

    const summary = await screen.findByLabelText("Qualifying summary");
    expect(within(summary).getByText("Sergio Perez")).toBeInTheDocument();
    expect(within(summary).getByText("1:28.990")).toBeInTheDocument();
  });

  it("renders driver, constructor and session columns in the classification", async () => {
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    await renderAtRound("5");

    const table = await screen.findByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Constructor" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Q1" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Q2" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Q3" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Tire strategy" })
    ).toBeInTheDocument();

    const driverLink = within(table).getByRole("link", {
      name: /VER Max Verstappen/,
    });
    expect(driverLink).toHaveAttribute("href", "/driver/max_verstappen");
    expect(within(table).getByText("Red Bull")).toBeInTheDocument();
  });

  it("renders tire strategy details from same-round pit stop data", async () => {
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    await renderAtRound("5");

    expect(await screen.findByText("Soft → Medium")).toBeInTheDocument();
    expect(screen.getByText("2 stops · Laps 18 / 42")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("1 stop · Laps 21")).toBeInTheDocument();
    expect(screen.getByText("No stops")).toBeInTheDocument();
    expect(screen.getByText("Strategy unavailable")).toBeInTheDocument();
  });

  it("downloads the current qualifying results table data as a CSV file", async () => {
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    await renderAtRound("5");

    await screen.findByText("VER");
    const q1Header = screen.getByRole("columnheader", { name: /q1/i });
    fireEvent.click(within(q1Header).getByRole("button"));

    fireEvent.click(
      screen.getByRole("button", {
        name: /download qualifying results table data for 2024 round 5/i,
      })
    );

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv.split("\n")).toEqual([
      "Position,Driver,Constructor,Q1,Q2,Q3,Tire strategy",
      "2,LEC - Charles Leclerc,Ferrari,1:29.165,1:28.884,1:28.786,Hard (1 stop · Laps 21)",
      "1,VER - Max Verstappen,Red Bull,1:29.179,1:28.740,1:28.197,Soft → Medium (2 stops · Laps 18 / 42)",
      "20,SAR - Logan Sargeant,Williams,1:31.652,—,—,No stops (Strategy unavailable)",
    ]);
    expect(anchorClickMock).toHaveBeenCalledWith(
      "blob:qualifying-results",
      "2024-round-5-qualifying-results.csv"
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:qualifying-results");
  });

  it("sorts the classification by Q1, Q2 and Q3 session times", async () => {
    getQualifyingResults.mockResolvedValue(SORTABLE_RESULTS);
    await renderAtRound("5");

    await screen.findByText("VER");
    const q1Header = screen.getByRole("columnheader", { name: /q1/i });
    const q2Header = screen.getByRole("columnheader", { name: /q2/i });
    const q3Header = screen.getByRole("columnheader", { name: /q3/i });

    expect(q1Header).toHaveAttribute("aria-sort", "none");
    expect(q2Header).toHaveAttribute("aria-sort", "none");
    expect(q3Header).toHaveAttribute("aria-sort", "none");
    expect(getDisplayedDriverCodes()).toEqual(["VER", "LEC", "NOR"]);

    fireEvent.click(within(q1Header).getByRole("button"));
    expect(q1Header).toHaveAttribute("aria-sort", "ascending");
    expect(getDisplayedDriverCodes()).toEqual(["LEC", "VER", "NOR"]);

    fireEvent.click(within(q1Header).getByRole("button"));
    expect(q1Header).toHaveAttribute("aria-sort", "descending");
    expect(getDisplayedDriverCodes()).toEqual(["NOR", "VER", "LEC"]);

    fireEvent.click(within(q2Header).getByRole("button"));
    expect(q1Header).toHaveAttribute("aria-sort", "none");
    expect(q2Header).toHaveAttribute("aria-sort", "ascending");
    expect(getDisplayedDriverCodes()).toEqual(["NOR", "VER", "LEC"]);

    fireEvent.click(within(q3Header).getByRole("button"));
    expect(q2Header).toHaveAttribute("aria-sort", "none");
    expect(q3Header).toHaveAttribute("aria-sort", "ascending");
    expect(getDisplayedDriverCodes()).toEqual(["LEC", "VER", "NOR"]);

    fireEvent.click(within(q3Header).getByRole("button"));
    expect(q3Header).toHaveAttribute("aria-sort", "descending");
    expect(getDisplayedDriverCodes()).toEqual(["VER", "LEC", "NOR"]);
  });

  it("falls back to permanent number or surname initials when driver code is missing", async () => {
    const missingCodes = [
      buildResult({
        position: "1",
        driverId: "lewis_hamilton",
        permanentNumber: "44",
        givenName: "Lewis",
        familyName: "Hamilton",
        constructorName: "Mercedes",
        q1: "1:29.100",
        q2: "1:28.600",
        q3: "1:28.400",
      }),
      buildResult({
        position: "2",
        driverId: "oliver_bearman",
        givenName: "Oliver",
        familyName: "Bearman",
        constructorName: "Ferrari",
        q1: "1:29.210",
        q2: "1:28.810",
        q3: "1:28.610",
      }),
    ];
    getQualifyingResults.mockResolvedValue(missingCodes);
    await renderAtRound("6");

    const table = await screen.findByRole("table");
    expect(
      within(table).getByRole("link", { name: /44 Lewis Hamilton/ })
    ).toHaveAttribute("href", "/driver/lewis_hamilton");
    expect(
      within(table).getByRole("link", { name: /BEA Oliver Bearman/ })
    ).toHaveAttribute("href", "/driver/oliver_bearman");
  });

  it("uses a dash for sessions where the driver did not progress", async () => {
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    await renderAtRound("5");

    const driverName = await screen.findByText("Logan Sargeant");
    const row = driverName.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row).getAllByText("—")).toHaveLength(2);
  });

  it("calls the API with the round from the URL", async () => {
    getQualifyingResults.mockResolvedValue(SAMPLE_RESULTS);
    getRacePitStops.mockResolvedValue(SAMPLE_PIT_STOPS);
    await renderAtRound("9");

    await screen.findByRole("heading", { name: "Round 9 Qualifying Results" });
    expect(getQualifyingResults).toHaveBeenCalledWith("9", "2024");
    expect(getRacePitStops).toHaveBeenCalledWith("9", "2024");
  });
});
