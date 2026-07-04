import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QualifyingPage from "./QualifyingPage";
import { buildQualifyingPerformance } from "./qualifyingPerformance";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";
import { getAllQualifyingResults } from "../../services/api/racesApi";

// Mock the API service so each test can drive the underlying useQuery
// state (loading / success / error) deterministically without touching
// the network.
vi.mock("../../services/api/racesApi", () => ({
  getAllQualifyingResults: vi.fn(),
}));

// react-world-flags fetches an SVG sprite at runtime; replacing it with
// a stub lets us assert on the country code passed in without dealing
// with network/asset noise in jsdom.
vi.mock("react-world-flags", () => ({
  default: ({ code }) => <span data-testid="flag" data-code={code} />,
}));

const buildResult = ({
  position,
  driverId,
  givenName,
  familyName,
  constructorName,
  q3,
}) => ({
  position,
  Driver: {
    driverId,
    givenName,
    familyName,
    nationality: "Dutch",
  },
  Constructor: {
    constructorId: constructorName.toLowerCase().replace(/ /g, "_"),
    name: constructorName,
  },
  Q1: "1:30.000",
  Q2: "1:29.000",
  ...(q3 ? { Q3: q3 } : {}),
});

const buildQuali = ({
  round,
  raceName,
  date,
  locality,
  country,
  results = [],
}) => ({
  season: "2024",
  round,
  raceName,
  date,
  Circuit: {
    circuitId: `circuit-${round}`,
    circuitName: `${raceName} Circuit`,
    Location: { locality, country },
  },
  results,
});

// Past dates (well before any plausible test run) and a far-future date
// keep the `new Date(quali.date) <= new Date()` filter deterministic
// without having to fake the system clock.
const PAST_QUALIS = [
  buildQuali({
    round: "1",
    raceName: "Bahrain GP",
    date: "2020-03-01",
    locality: "Sakhir",
    country: "Bahrain",
  }),
  buildQuali({
    round: "2",
    raceName: "Saudi Arabia GP",
    date: "2021-03-15",
    locality: "Jeddah",
    country: "Saudi Arabia",
  }),
  buildQuali({
    round: "3",
    raceName: "Australian GP",
    date: "2022-04-10",
    locality: "Melbourne",
    country: "Australia",
  }),
];

const FUTURE_QUALIS = [
  buildQuali({
    round: "20",
    raceName: "Future GP",
    date: "3000-01-01",
    locality: "Olympus Mons",
    country: "Mars",
  }),
];

const QUALIS_WITH_RESULTS = [
  buildQuali({
    round: "1",
    raceName: "Bahrain GP",
    date: "2020-03-01",
    locality: "Sakhir",
    country: "Bahrain",
    results: [
      buildResult({
        position: "1",
        driverId: "max_verstappen",
        givenName: "Max",
        familyName: "Verstappen",
        constructorName: "Red Bull",
        q3: "1:28.000",
      }),
      buildResult({
        position: "2",
        driverId: "charles_leclerc",
        givenName: "Charles",
        familyName: "Leclerc",
        constructorName: "Ferrari",
        q3: "1:28.200",
      }),
      buildResult({
        position: "11",
        driverId: "lando_norris",
        givenName: "Lando",
        familyName: "Norris",
        constructorName: "McLaren",
      }),
    ],
  }),
  buildQuali({
    round: "2",
    raceName: "Saudi Arabia GP",
    date: "2021-03-15",
    locality: "Jeddah",
    country: "Saudi Arabia",
    results: [
      buildResult({
        position: "2",
        driverId: "max_verstappen",
        givenName: "Max",
        familyName: "Verstappen",
        constructorName: "Red Bull",
        q3: "1:27.900",
      }),
      buildResult({
        position: "1",
        driverId: "charles_leclerc",
        givenName: "Charles",
        familyName: "Leclerc",
        constructorName: "Ferrari",
        q3: "1:27.700",
      }),
      buildResult({
        position: "5",
        driverId: "lando_norris",
        givenName: "Lando",
        familyName: "Norris",
        constructorName: "McLaren",
        q3: "1:28.700",
      }),
    ],
  }),
];

const renderQualifyingPage = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: "/qualifying",
    routes: [
      { path: "/qualifying", element: <QualifyingPage /> },
      {
        path: "/qualifying/$round",
        element: <div data-testid="qualifying-page" />,
      },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("QualifyingPage", () => {
  beforeEach(() => {
    getAllQualifyingResults.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the qualifying skeleton while the all-qualifying query is pending", async () => {
    getAllQualifyingResults.mockReturnValue(new Promise(() => {}));
    await renderQualifyingPage();

    expect(screen.getByTestId("qualifying-page-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading qualifying sessions for 2024"
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders the error message when the query fails", async () => {
    getAllQualifyingResults.mockRejectedValue(new Error("network down"));
    await renderQualifyingPage();

    expect(await screen.findByText("Error: network down")).toBeInTheDocument();
    expect(screen.queryByTestId("qualifying-page-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Qualifying · 2024" })
    ).not.toBeInTheDocument();
  });

  it("renders the page heading and sets the document title", async () => {
    getAllQualifyingResults.mockResolvedValue([]);
    await renderQualifyingPage();

    expect(
      await screen.findByRole("heading", { name: "Qualifying · 2024" })
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Qualifying"));
  });

  it("renders translated qualifying content in Spanish", async () => {
    await i18n.changeLanguage("es");
    getAllQualifyingResults.mockResolvedValue(QUALIS_WITH_RESULTS);

    await renderQualifyingPage();

    expect(
      await screen.findByRole("heading", { name: "Clasificación · 2024" })
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Clasificación"));
    expect(
      screen.getByRole("button", {
        name: "Mostrar primero las más recientes",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Rendimiento en clasificación" })
    ).toBeInTheDocument();
    expect(screen.getByText("3 pilotos comparados")).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: "Sesiones de clasificación completadas",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Ronda 1")).toBeInTheDocument();
    expect(screen.getAllByText("Ver resultados").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        new Intl.DateTimeFormat("es").format(new Date("2020-03-01"))
      )
    ).toBeInTheDocument();
  });

  it("renders the toggle button with the default label when data resolves", async () => {
    getAllQualifyingResults.mockResolvedValue([]);
    await renderQualifyingPage();

    expect(
      await screen.findByRole("button", { name: "Show latest first" })
    ).toBeInTheDocument();
  });

  it("renders only past qualifyings and excludes future ones", async () => {
    getAllQualifyingResults.mockResolvedValue([
      ...PAST_QUALIS,
      ...FUTURE_QUALIS,
    ]);
    await renderQualifyingPage();

    await screen.findByText("Bahrain GP");
    expect(screen.getByText("Saudi Arabia GP")).toBeInTheDocument();
    expect(screen.getByText("Australian GP")).toBeInTheDocument();
    expect(screen.queryByText("Future GP")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PAST_QUALIS.length);
  });

  it("renders past qualifyings sorted ascending by date by default", async () => {
    // Provide the qualifyings out of order to make sure the component sorts
    // them rather than relying on the upstream payload order.
    const shuffled = [PAST_QUALIS[2], PAST_QUALIS[0], PAST_QUALIS[1]];
    getAllQualifyingResults.mockResolvedValue(shuffled);
    await renderQualifyingPage();

    await screen.findByText("Bahrain GP");
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Bahrain GP")).toBeInTheDocument();
    expect(within(items[1]).getByText("Saudi Arabia GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Australian GP")).toBeInTheDocument();
  });

  it("toggles to descending order and updates the button label when clicked", async () => {
    getAllQualifyingResults.mockResolvedValue(PAST_QUALIS);
    await renderQualifyingPage();

    const toggle = await screen.findByRole("button", {
      name: "Show latest first",
    });
    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", {
        name: "Show chronological order",
      })
    ).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Australian GP")).toBeInTheDocument();
    expect(within(items[1]).getByText("Saudi Arabia GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Bahrain GP")).toBeInTheDocument();
  });

  it("toggles back to ascending order on a second click", async () => {
    getAllQualifyingResults.mockResolvedValue(PAST_QUALIS);
    await renderQualifyingPage();

    const toggle = await screen.findByRole("button", {
      name: "Show latest first",
    });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Show latest first" })
    ).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Bahrain GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Australian GP")).toBeInTheDocument();
  });

  it("links each qualifying to its round-specific results route", async () => {
    getAllQualifyingResults.mockResolvedValue(PAST_QUALIS);
    await renderQualifyingPage();

    const bahrainLink = await screen.findByRole("link", {
      name: /Bahrain GP/,
    });
    expect(bahrainLink).toHaveAttribute("href", "/qualifying/1");
    expect(
      screen.getByRole("link", { name: /Saudi Arabia GP/ })
    ).toHaveAttribute("href", "/qualifying/2");
    expect(screen.getByRole("link", { name: /Australian GP/ })).toHaveAttribute(
      "href",
      "/qualifying/3"
    );
  });

  it("renders completed qualifyings in a responsive card grid", async () => {
    getAllQualifyingResults.mockResolvedValue(PAST_QUALIS);
    await renderQualifyingPage();

    const list = await screen.findByRole("list", {
      name: /completed qualifying sessions/i,
    });
    expect(list).toHaveClass(
      "grid",
      "grid-cols-1",
      "sm:grid-cols-2",
      "xl:grid-cols-3"
    );

    const firstItem = within(list).getAllByRole("listitem")[0];
    expect(firstItem).toHaveClass("overflow-hidden", "rounded-3xl");
    expect(
      within(firstItem).getByRole("link", { name: /Bahrain GP/ })
    ).toHaveClass("flex", "h-full", "p-5");
    expect(within(firstItem).getByText("Round 1")).toBeInTheDocument();
    expect(
      within(firstItem).getByText("Bahrain GP Circuit")
    ).toBeInTheDocument();
  });

  it("renders each qualifying's locality, country and resolved flag code", async () => {
    getAllQualifyingResults.mockResolvedValue([PAST_QUALIS[0]]);
    await renderQualifyingPage();

    const item = await screen.findByRole("listitem");
    expect(within(item).getByText(/Sakhir,\s+Bahrain/)).toBeInTheDocument();

    const flag = within(item).getByTestId("flag");
    expect(flag).toHaveAttribute("data-code", "BH");
  });

  it("renders the locale-formatted date for each qualifying", async () => {
    getAllQualifyingResults.mockResolvedValue([PAST_QUALIS[0]]);
    await renderQualifyingPage();

    const expected = new Intl.DateTimeFormat("en").format(
      new Date("2020-03-01")
    );
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("renders the toggle button but no list items when no past qualifyings exist", async () => {
    getAllQualifyingResults.mockResolvedValue(FUTURE_QUALIS);
    await renderQualifyingPage();

    expect(
      await screen.findByRole("button", { name: "Show latest first" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no qualifying sessions available/i })
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("handles an empty data array without throwing", async () => {
    getAllQualifyingResults.mockResolvedValue([]);
    await renderQualifyingPage();

    await screen.findByRole("button", { name: "Show latest first" });
    expect(
      screen.getByRole("heading", { name: /no qualifying sessions available/i })
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it("aggregates driver qualifying performance by average position", () => {
    const performance = buildQualifyingPerformance(QUALIS_WITH_RESULTS);

    expect(performance.map((driver) => driver.driverId)).toEqual([
      "charles_leclerc",
      "max_verstappen",
      "lando_norris",
    ]);
    expect(performance[0]).toMatchObject({
      driverName: "Charles Leclerc",
      averagePosition: 1.5,
      bestPosition: 1,
      worstPosition: 2,
      poles: 1,
      q3Appearances: 2,
      appearances: 2,
    });
    expect(performance[2]).toMatchObject({
      driverName: "Lando Norris",
      averagePosition: 8,
      q3Appearances: 1,
    });
  });

  it("renders a driver qualifying performance comparison chart", async () => {
    getAllQualifyingResults.mockResolvedValue(QUALIS_WITH_RESULTS);
    await renderQualifyingPage();

    expect(
      await screen.findByRole("heading", { name: "Qualifying performance" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /driver qualifying average position comparison chart/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Pole leader")).toBeInTheDocument();
    expect(screen.getByText("3 drivers compared")).toBeInTheDocument();
    expect(screen.getByText(/P1.5 · best P1/)).toBeInTheDocument();

    const norrisMarker = screen.getByRole("button", {
      name: /Lando Norris: average qualifying position P8/i,
    });
    fireEvent.focus(norrisMarker);

    expect(screen.getByText("McLaren")).toBeInTheDocument();
    expect(screen.getByText("50% · 1/2")).toBeInTheDocument();
  });
});
