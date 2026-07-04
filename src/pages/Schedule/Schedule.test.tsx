import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Schedule from "./Schedule";
import i18n from "../../app/i18n";
import { renderWithRouter } from "../../test-utils/router";
import { getCurrentSeasonRaces } from "../../services/api/racesApi";

// Replace the API service with a vi-mock so each test can drive the
// useQuery state (loading / success / error) deterministically.
vi.mock("../../services/api/racesApi", () => ({
  getCurrentSeasonRaces: vi.fn(),
}));

vi.mock("../../hooks/useSelectedSeason", () => ({
  useSelectedSeason: () => ({
    selectedSeason: "2026",
    setSelectedSeason: () => undefined,
  }),
}));

// react-world-flags loads SVG country assets; stub it so the test stays
// focused on the component's own rendering.
vi.mock("react-world-flags", () => ({
  default: ({ code }) => <span data-testid="flag" data-code={code} />,
}));

const buildRace = ({
  round,
  raceName,
  date,
  time,
  locality,
  circuitName = `${locality} Circuit`,
  country,
  url,
}) => ({
  round,
  raceName,
  date,
  time,
  url,
  Circuit: {
    circuitId: circuitName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    circuitName,
    Location: { locality, country },
  },
});

// Use far-future / far-past dates so the component's `race.date >= now`
// filter behaves identically regardless of when the suite runs.
const FUTURE_RACES = [
  buildRace({
    round: "5",
    raceName: "Imola GP",
    date: "9999-05-19",
    time: "13:00:00Z",
    circuitName: "Autodromo Enzo e Dino Ferrari",
    locality: "Imola",
    country: "Italy",
    url: "https://example.com/imola",
  }),
  buildRace({
    round: "6",
    raceName: "Monaco GP",
    date: "9999-05-26",
    locality: "Monte Carlo",
    country: "Monaco",
  }),
];

const PAST_RACES = [
  buildRace({
    round: "1",
    raceName: "Bahrain GP",
    date: "2000-03-05",
    locality: "Sakhir",
    country: "Bahrain",
  }),
];

const renderWithProviders = async (initialPath = "/schedule?season=2026") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithRouter({
    initialPath,
    routes: [
      { path: "/schedule", element: <Schedule /> },
      { path: "/race/$race", element: <div data-testid="race-page" /> },
      { path: "/circuit/$id", element: <div data-testid="circuit-page" /> },
    ],
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe("Schedule", () => {
  beforeEach(() => {
    getCurrentSeasonRaces.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the schedule skeleton while the current-season races query is pending", async () => {
    getCurrentSeasonRaces.mockReturnValue(new Promise(() => {}));
    await renderWithProviders();
    expect(screen.getByTestId("schedule-page-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/Race Events Calendar/)).not.toBeInTheDocument();
  });

  it("sets the document title to 'Schedule'", async () => {
    getCurrentSeasonRaces.mockResolvedValue([]);
    await renderWithProviders();
    await waitFor(() => expect(document.title).toBe("Schedule"));
  });

  it("renders the error message when the query fails", async () => {
    getCurrentSeasonRaces.mockRejectedValue(new Error("boom"));
    await renderWithProviders();
    expect(await screen.findByText("Error: boom")).toBeInTheDocument();
    expect(screen.queryByText(/Race Events Calendar/)).not.toBeInTheDocument();
  });

  it("renders one calendar card per race with name, date, location and link", async () => {
    getCurrentSeasonRaces.mockResolvedValue([...PAST_RACES, ...FUTURE_RACES]);
    await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: "Race Events Calendar · 2026",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("3 rounds")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view imola gp details/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view monaco gp details/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view bahrain gp details/i })
    ).toBeInTheDocument();

    const imolaLink = screen.getByRole("link", {
      name: /view imola gp details/i,
    });
    expect(imolaLink).toHaveAttribute("href", "/race/5?season=2026");
    expect(within(imolaLink).getByText(/Imola, Italy/)).toBeInTheDocument();
    expect(within(imolaLink).getByText(/May 19/)).toBeInTheDocument();
    expect(within(imolaLink).getByText("Next race")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /view monaco gp details/i })
    ).toHaveAttribute("href", "/race/6?season=2026");
    expect(
      screen.getByRole("link", {
        name: /view autodromo enzo e dino ferrari circuit profile/i,
      })
    ).toHaveAttribute(
      "href",
      "/circuit/autodromo_enzo_e_dino_ferrari?season=2026"
    );
  });

  it("renders Google and ICS calendar links for each race event", async () => {
    getCurrentSeasonRaces.mockResolvedValue(FUTURE_RACES);
    await renderWithProviders();

    const googleLink = await screen.findByRole("link", {
      name: /add imola gp to google calendar/i,
    });
    const googleUrl = new URL(googleLink.getAttribute("href") ?? "");

    expect(googleUrl.origin).toBe("https://calendar.google.com");
    expect(googleUrl.searchParams.get("action")).toBe("TEMPLATE");
    expect(googleUrl.searchParams.get("text")).toBe("Imola GP");
    expect(googleUrl.searchParams.get("dates")).toBe(
      "99990519T130000Z/99990519T150000Z"
    );
    expect(googleUrl.searchParams.get("location")).toContain(
      "Autodromo Enzo e Dino Ferrari, Imola, Italy"
    );

    const icsLink = screen.getByRole("link", {
      name: /download calendar file for imola gp/i,
    });
    expect(icsLink).toHaveAttribute("download", "imola-gp-round-5.ics");
    expect(icsLink.getAttribute("href")).toContain("BEGIN%3AVCALENDAR");
    expect(icsLink.getAttribute("href")).toContain(
      "DTSTART%3A99990519T130000Z"
    );
  });

  it("renders localized calendar content when Spanish is selected", async () => {
    await i18n.changeLanguage("es");
    getCurrentSeasonRaces.mockResolvedValue(FUTURE_RACES);
    await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: "Calendario de eventos de carrera · 2026",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("2 rondas")).toBeInTheDocument();
    expect(screen.getByText("Resumen completo de la temporada")).toBeInTheDocument();
    expect(screen.getByText("Ronda 5")).toBeInTheDocument();
    expect(screen.getByText("Próxima carrera")).toBeInTheDocument();
    expect(screen.getAllByText("Añadir al calendario")).toHaveLength(2);

    await waitFor(() => expect(document.title).toBe("Calendario"));

    const googleLink = screen.getByRole("link", {
      name: /añadir imola gp a google calendar/i,
    });
    const googleUrl = new URL(googleLink.getAttribute("href") ?? "");
    expect(googleUrl.searchParams.get("details")).toContain(
      "Ronda 5 de la temporada 2026 de Formula 1."
    );
    expect(googleUrl.searchParams.get("details")).toContain(
      "Circuito: Autodromo Enzo e Dino Ferrari."
    );
  });

  it("passes the matching ISO country code to the flag for each race", async () => {
    getCurrentSeasonRaces.mockResolvedValue(FUTURE_RACES);
    await renderWithProviders();

    await screen.findByRole("link", { name: /view imola gp details/i });
    const codes = screen
      .getAllByTestId("flag")
      .map((flag) => flag.getAttribute("data-code"));
    expect(codes).toEqual(expect.arrayContaining(["IT", "MC"]));
  });

  it("falls back to an empty country code when the country is not recognised", async () => {
    getCurrentSeasonRaces.mockResolvedValue([
      buildRace({
        round: "9",
        raceName: "Atlantis GP",
        date: "9999-12-31",
        locality: "Atlantis",
        country: "Atlantis",
      }),
    ]);
    await renderWithProviders();

    await screen.findByRole("link", { name: /view atlantis gp details/i });
    expect(screen.getByTestId("flag")).toHaveAttribute("data-code", "");
  });

  it("sorts all race events by date ascending", async () => {
    // Provide them in reverse chronological order to confirm the component
    // re-sorts them client-side.
    getCurrentSeasonRaces.mockResolvedValue(
      [...PAST_RACES, ...FUTURE_RACES].reverse()
    );
    await renderWithProviders();

    await screen.findByRole("link", { name: /view imola gp details/i });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Bahrain GP")).toBeInTheDocument();
    expect(within(items[1]).getByText("Imola GP")).toBeInTheDocument();
    expect(within(items[2]).getByText("Monaco GP")).toBeInTheDocument();
  });

  it("renders race cards in lazy batches and loads more on demand", async () => {
    const races = Array.from({ length: 8 }, (_, index) =>
      buildRace({
        round: String(index + 1),
        raceName: `Test GP ${index + 1}`,
        date: `9999-06-${String(index + 1).padStart(2, "0")}`,
        locality: `City ${index + 1}`,
        country: "Italy",
      })
    );
    getCurrentSeasonRaces.mockResolvedValue(races);
    await renderWithProviders();

    expect(
      await screen.findByRole("heading", {
        name: "Race Events Calendar · 2026",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("8 rounds")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.queryByText("Test GP 7")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /load 2 more races/i }));

    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByText("Test GP 7")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /load more races/i })
    ).not.toBeInTheDocument();
  });

  it("renders the heading without race items when the data array is empty", async () => {
    getCurrentSeasonRaces.mockResolvedValue([]);
    await renderWithProviders();
    expect(
      await screen.findByRole("heading", {
        name: "Race Events Calendar · 2026",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no race events scheduled/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("keeps completed races visible in the full-season calendar", async () => {
    getCurrentSeasonRaces.mockResolvedValue(PAST_RACES);
    await renderWithProviders();
    expect(
      await screen.findByRole("heading", {
        name: "Race Events Calendar · 2026",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Bahrain GP")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
