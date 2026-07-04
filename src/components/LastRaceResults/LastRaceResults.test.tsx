import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { renderWithRouter } from "../../test-utils/router";

vi.mock("../../hooks/queries", () => ({
  useLastRaceResults: vi.fn(),
  useLastRaceInfo: vi.fn(),
}));

vi.mock("../../domain/f1/driversImage", () => ({
  getDriverImage: (driverId) =>
    ({
      max_verstappen: "/img/max.png",
      lando_norris: "/img/lando.png",
      charles_leclerc: "/img/charles.png",
      george_russell: "/img/george.png",
    })[driverId],
}));

vi.mock("../../domain/f1/teamLogo", () => {
  const logos: Record<string, string> = {
    "Red Bull": "/img/redbull.png",
    McLaren: "/img/mclaren.png",
    Ferrari: "/img/ferrari.png",
    Mercedes: "/img/mercedes.png",
  };

  return {
    default: logos,
    getTeamLogo: (teamName: string) => logos[teamName],
  };
});

vi.mock("../Loader/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));

import LastRaceResults from "./LastRaceResults";
import { useLastRaceResults, useLastRaceInfo } from "../../hooks/queries";

const makeResult = (overrides = {}) => ({
  position: "1",
  points: "25",
  status: "Finished",
  Time: { time: "1:30:00.000" },
  Driver: {
    driverId: "max_verstappen",
    givenName: "Max",
    familyName: "Verstappen",
  },
  Constructor: { name: "Red Bull" },
  ...overrides,
});

const sampleResults = [
  makeResult(),
  makeResult({
    position: "2",
    points: "18",
    Time: { time: "+5.000" },
    Driver: {
      driverId: "lando_norris",
      givenName: "Lando",
      familyName: "Norris",
    },
    Constructor: { name: "McLaren" },
  }),
  makeResult({
    position: "3",
    points: "15",
    Time: { time: "+10.000" },
    Driver: {
      driverId: "charles_leclerc",
      givenName: "Charles",
      familyName: "Leclerc",
    },
    Constructor: { name: "Ferrari" },
  }),
  makeResult({
    position: "4",
    points: "12",
    Time: undefined,
    status: "DNF",
    Driver: {
      driverId: "george_russell",
      givenName: "George",
      familyName: "Russell",
    },
    Constructor: { name: "Mercedes" },
  }),
];

const sampleRaceInfo = {
  raceName: "Monaco Grand Prix",
  date: "2024-05-26",
  Circuit: {
    circuitName: "Circuit de Monaco",
    Location: { locality: "Monte-Carlo", country: "Monaco" },
  },
};

const renderComponent = async () =>
  renderWithRouter({
    initialPath: "/",
    routes: [
      { path: "/", element: <LastRaceResults /> },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
  });

const setHooks = ({ results = {}, info = {} } = {}) => {
  useLastRaceResults.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...results,
  });
  useLastRaceInfo.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...info,
  });
};

describe("LastRaceResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Loader while either query is loading", async () => {
    setHooks({ results: { isLoading: true } });
    await renderComponent();
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders an error message and logs the error when a query fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setHooks({ results: { error: new Error("boom") } });
    await renderComponent();
    expect(screen.getByText(/Error: boom/)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching last race results:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("renders an empty-state message when no results are returned", async () => {
    setHooks({ results: { data: [] }, info: { data: sampleRaceInfo } });
    await renderComponent();
    expect(
      screen.getByText(/No results found for the last race\./i)
    ).toBeInTheDocument();
  });

  it("renders an empty-state message when raceInfo is missing", async () => {
    setHooks({ results: { data: sampleResults }, info: { data: null } });
    await renderComponent();
    expect(
      screen.getByText(/No results found for the last race\./i)
    ).toBeInTheDocument();
  });

  describe("with full data", () => {
    beforeEach(() => {
      setHooks({
        results: { data: sampleResults },
        info: { data: sampleRaceInfo },
      });
    });

    it("renders the race header with name, circuit, location and date", async () => {
      await renderComponent();
      expect(screen.getByText(/Last Race Results · 2024/)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Monaco Grand Prix" })
      ).toBeInTheDocument();
      expect(screen.getByText("Circuit de Monaco")).toBeInTheDocument();
      expect(screen.getByText(/Monte-Carlo, Monaco/)).toBeInTheDocument();
      // Date is locale-formatted; assert on a stable substring.
      expect(screen.getByText(/May 26, 2024/)).toBeInTheDocument();
    });

    it("falls back to circuit name when raceName is missing", async () => {
      setHooks({
        results: { data: sampleResults },
        info: {
          data: {
            ...sampleRaceInfo,
            raceName: undefined,
          },
        },
      });
      await renderComponent();
      expect(
        screen.getByRole("heading", { name: "Circuit de Monaco" })
      ).toBeInTheDocument();
    });

    it("renders the top three drivers on the podium with ordinal labels", async () => {
      await renderComponent();
      expect(screen.getByText("1st")).toBeInTheDocument();
      expect(screen.getByText("2nd")).toBeInTheDocument();
      expect(screen.getByText("3rd")).toBeInTheDocument();
      expect(screen.getByText("Max Verstappen")).toBeInTheDocument();
      expect(screen.getByText("Lando Norris")).toBeInTheDocument();
      expect(screen.getByText("Charles Leclerc")).toBeInTheDocument();
    });

    it("links each podium driver to their profile page", async () => {
      await renderComponent();
      const podiumLink = screen.getByAltText("Max Verstappen").closest("a");
      expect(podiumLink).toHaveAttribute("href", "/driver/max_verstappen");
    });

    it("renders the remaining drivers in the results list with correct data", async () => {
      await renderComponent();
      expect(screen.getByText("George Russell")).toBeInTheDocument();
      const teamCell = screen.getByText("Mercedes");
      expect(teamCell).toBeInTheDocument();
      // Position 4 row should display the status ("DNF") since Time is absent.
      expect(screen.getByText("DNF")).toBeInTheDocument();
      expect(screen.getByText("12 pts")).toBeInTheDocument();
    });

    it("uses the team logo image for non-podium rows", async () => {
      await renderComponent();
      const logo = screen.getByAltText("Mercedes");
      expect(logo).toHaveAttribute("src", "/img/mercedes.png");
    });

    it("does not render the meta location segment when Location is missing", async () => {
      setHooks({
        results: { data: sampleResults },
        info: {
          data: {
            ...sampleRaceInfo,
            Circuit: { circuitName: "Circuit de Monaco" },
          },
        },
      });
      await renderComponent();
      expect(screen.queryByText(/Monte-Carlo/)).not.toBeInTheDocument();
    });

    it("renders the column headers for the results list", async () => {
      await renderComponent();
      expect(screen.getByText("Pos")).toBeInTheDocument();
      expect(screen.getByText("Driver")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Time / Status")).toBeInTheDocument();
      expect(screen.getByText("Pts")).toBeInTheDocument();
    });

    it("renders translated labels in Spanish", async () => {
      await i18n.changeLanguage("es");

      await renderComponent();

      expect(
        screen.getByText(/Resultados de la última carrera · 2024/)
      ).toBeInTheDocument();
      expect(screen.getByText("1.º")).toBeInTheDocument();
      expect(screen.getByText("Pos.")).toBeInTheDocument();
      expect(screen.getByText("Piloto")).toBeInTheDocument();
      expect(screen.getByText("Equipo")).toBeInTheDocument();
      expect(screen.getByText("Tiempo / Estado")).toBeInTheDocument();
      expect(screen.getByText("Ptos")).toBeInTheDocument();
      expect(screen.getByText("25 ptos")).toBeInTheDocument();
    });
  });
});
