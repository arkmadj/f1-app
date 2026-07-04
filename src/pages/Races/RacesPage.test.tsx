import { fireEvent, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RacesPage from "./RacesPage";
import i18n from "../../app/i18n";
import { renderWithRouter } from "../../test-utils/router";
import { getCurrentSeasonRaces } from "../../services/api/racesApi";

// Mock the API service so each test can drive the underlying useQuery
// state (loading / success / error) deterministically without touching
// the network.
vi.mock("../../services/api/racesApi", () => ({
  getCurrentSeasonRaces: vi.fn(),
}));

// The Loader pulls in react-loader-spinner which renders SVG animations
// we don't care about here; a sentinel keeps the loading-state assertions
// trivial.
vi.mock("../../components/Loader/Loader", () => ({
  default: ({ label }: { label?: string }) => (
    <div data-testid="loader">{label}</div>
  ),
}));

// react-world-flags fetches an SVG sprite at runtime; replacing it with
// a stub lets us assert on the country code passed in without dealing
// with network/asset noise in jsdom.
vi.mock("react-world-flags", () => ({
  default: ({ code }: { code: string }) => (
    <span data-testid="flag" data-code={code} />
  ),
}));

const buildRace = ({ round, raceName, date, locality, country }) => ({
  season: "2024",
  round,
  raceName,
  date,
  Circuit: {
    circuitId: `circuit-${round}`,
    circuitName: `${raceName} Circuit`,
    Location: { locality, country },
  },
});

// Past dates (well before any plausible test run) and a far-future date
// keep the `new Date(race.date) < new Date()` filter deterministic
// without having to fake the system clock.
const PAST_RACES = [
  buildRace({
    round: "1",
    raceName: "Bahrain GP",
    date: "2020-03-01",
    locality: "Sakhir",
    country: "Bahrain",
  }),
  buildRace({
    round: "2",
    raceName: "Saudi Arabia GP",
    date: "2021-03-15",
    locality: "Jeddah",
    country: "Saudi Arabia",
  }),
  buildRace({
    round: "3",
    raceName: "Australian GP",
    date: "2022-04-10",
    locality: "Melbourne",
    country: "Australia",
  }),
];

const FUTURE_RACES = [
  buildRace({
    round: "20",
    raceName: "Future GP",
    date: "3000-01-01",
    locality: "Olympus Mons",
    country: "Mars",
  }),
];

const renderRacesPage = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath: "/race",
    routes: [
      { path: "/race", element: <RacesPage /> },
      { path: "/race/$race", element: <div data-testid="race-page" /> },
      { path: "/circuit/$id", element: <div data-testid="circuit-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("RacesPage", () => {
  beforeEach(() => {
    getCurrentSeasonRaces.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the loader while the current-season races query is pending", async () => {
    getCurrentSeasonRaces.mockReturnValue(new Promise(() => {}));
    await renderRacesPage();

    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.getByTestId("loader")).toHaveTextContent("Loading races");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders the error message when the query fails", async () => {
    getCurrentSeasonRaces.mockRejectedValue(new Error("network down"));
    await renderRacesPage();

    expect(await screen.findByText("Error: network down")).toBeInTheDocument();
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the page heading and sets the document title", async () => {
    getCurrentSeasonRaces.mockResolvedValue([]);
    await renderRacesPage();

    expect(
      await screen.findByRole("heading", { name: "Races · 2024" })
    ).toBeInTheDocument();
    expect(document.title).toBe("Races");
  });

  it("renders localized Spanish content when the language changes", async () => {
    await i18n.changeLanguage("es");
    getCurrentSeasonRaces.mockResolvedValue([PAST_RACES[0]]);
    await renderRacesPage();

    expect(
      await screen.findByRole("heading", { name: "Carreras · 2024" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mostrar carreras por la más reciente" })
    ).toBeInTheDocument();
    expect(screen.getByText("1/3/2020")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver perfil del circuito de circuit-1/i })
    ).toHaveAttribute("href", "/circuit/circuit-1");
    expect(document.title).toBe("Carreras");
  });

  it("renders the toggle button with the default label when data resolves", async () => {
    getCurrentSeasonRaces.mockResolvedValue([]);
    await renderRacesPage();

    expect(
      await screen.findByRole("button", { name: "Show races by latest" })
    ).toBeInTheDocument();
  });

  it("renders only past races and excludes future ones", async () => {
    getCurrentSeasonRaces.mockResolvedValue([...PAST_RACES, ...FUTURE_RACES]);
    await renderRacesPage();

    await screen.findByText("Bahrain GP");
    expect(screen.getByText("Saudi Arabia GP")).toBeInTheDocument();
    expect(screen.getByText("Australian GP")).toBeInTheDocument();
    expect(screen.queryByText("Future GP")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PAST_RACES.length);
  });

  it("renders past races sorted ascending by date by default", async () => {
    // Provide the races out of order to make sure the component sorts
    // them rather than relying on the upstream payload order.
    const shuffled = [PAST_RACES[2], PAST_RACES[0], PAST_RACES[1]];
    getCurrentSeasonRaces.mockResolvedValue(shuffled);
    await renderRacesPage();

    await screen.findByText("Bahrain GP");
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Bahrain GP")).toBeInTheDocument();
    expect(within(items[1]).getByText("Saudi Arabia GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Australian GP")).toBeInTheDocument();
  });

  it("toggles to descending order and updates the button label when clicked", async () => {
    getCurrentSeasonRaces.mockResolvedValue(PAST_RACES);
    await renderRacesPage();

    const toggle = await screen.findByRole("button", {
      name: "Show races by latest",
    });
    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Show races in original order" })
    ).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Australian GP")).toBeInTheDocument();
    expect(within(items[1]).getByText("Saudi Arabia GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Bahrain GP")).toBeInTheDocument();
  });

  it("toggles back to ascending order on a second click", async () => {
    getCurrentSeasonRaces.mockResolvedValue(PAST_RACES);
    await renderRacesPage();

    const toggle = await screen.findByRole("button", {
      name: "Show races by latest",
    });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Show races by latest" })
    ).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Bahrain GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Australian GP")).toBeInTheDocument();
  });

  it("links each race to its round-specific results route", async () => {
    getCurrentSeasonRaces.mockResolvedValue(PAST_RACES);
    await renderRacesPage();

    const bahrainLink = await screen.findByRole("link", {
      name: /Bahrain GP/,
    });
    expect(bahrainLink).toHaveAttribute("href", "/race/1");
    expect(
      screen.getByRole("link", { name: /Saudi Arabia GP/ })
    ).toHaveAttribute("href", "/race/2");
    expect(screen.getByRole("link", { name: /Australian GP/ })).toHaveAttribute(
      "href",
      "/race/3"
    );
    expect(
      screen.getByRole("link", {
        name: /view circuit profile for circuit-1/i,
      })
    ).toHaveAttribute("href", "/circuit/circuit-1");
  });

  it("renders each race's locality, country and resolved flag code", async () => {
    getCurrentSeasonRaces.mockResolvedValue([PAST_RACES[0]]);
    await renderRacesPage();

    const item = await screen.findByRole("listitem");
    expect(within(item).getByText(/Sakhir,\s+Bahrain/)).toBeInTheDocument();

    const flag = within(item).getByTestId("flag");
    expect(flag).toHaveAttribute("data-code", "BH");
  });

  it("renders the locale-formatted date for each race", async () => {
    getCurrentSeasonRaces.mockResolvedValue([PAST_RACES[0]]);
    await renderRacesPage();

    const expected = new Date("2020-03-01").toLocaleDateString();
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("renders the toggle button but no list items when no past races exist", async () => {
    getCurrentSeasonRaces.mockResolvedValue(FUTURE_RACES);
    await renderRacesPage();

    expect(
      await screen.findByRole("button", { name: "Show races by latest" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no race results available/i })
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("handles an empty data array without throwing", async () => {
    getCurrentSeasonRaces.mockResolvedValue([]);
    await renderRacesPage();

    await screen.findByRole("button", { name: "Show races by latest" });
    expect(
      screen.getByRole("heading", { name: /no race results available/i })
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it("renders the localized loading label when Spanish is selected", async () => {
    await i18n.changeLanguage("es");
    getCurrentSeasonRaces.mockReturnValue(new Promise(() => {}));
    await renderRacesPage();

    expect(screen.getByTestId("loader")).toHaveTextContent(
      "Cargando carreras"
    );
  });
});
