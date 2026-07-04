import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConstructorComparison from "./ConstructorComparison";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";
import { validateConstructorComparisonSearch } from "../../domain/f1/constructorComparisonSearch";

vi.mock("react-world-flags", () => ({
  default: ({ code }: { code: string }) => (
    <span data-testid="flag" data-code={code} />
  ),
}));

const useConstructorStandingsMock = vi.fn();
const useConstructorStandingsTimelineMock = vi.fn();
const useConstructorRaceResultsMock = vi.fn();
const useDriversByConstructorMock = vi.fn();

vi.mock("../../hooks/queries", () => ({
  useConstructorStandings: (...args: unknown[]) =>
    useConstructorStandingsMock(...args),
  useConstructorStandingsTimeline: (...args: unknown[]) =>
    useConstructorStandingsTimelineMock(...args),
  useConstructorRaceResults: (...args: unknown[]) =>
    useConstructorRaceResultsMock(...args),
  useDriversByConstructor: (...args: unknown[]) =>
    useDriversByConstructorMock(...args),
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

const sampleConstructors = [
  {
    position: "1",
    points: "500",
    wins: "10",
    Constructor: {
      constructorId: "red_bull",
      name: "Red Bull",
      nationality: "Austrian",
    },
  },
  {
    position: "2",
    points: "350",
    wins: "4",
    Constructor: {
      constructorId: "ferrari",
      name: "Ferrari",
      nationality: "Italian",
    },
  },
  {
    position: "3",
    points: "300",
    wins: "2",
    Constructor: {
      constructorId: "mclaren",
      name: "McLaren",
      nationality: "British",
    },
  },
];

const sampleDriversByConstructor = {
  red_bull: [
    {
      position: "1",
      points: "300",
      wins: "7",
      Driver: {
        driverId: "max_verstappen",
        givenName: "Max",
        familyName: "Verstappen",
        nationality: "Dutch",
      },
      Constructors: [
        {
          constructorId: "red_bull",
          name: "Red Bull",
          nationality: "Austrian",
        },
      ],
    },
    {
      position: "5",
      points: "200",
      wins: "3",
      Driver: {
        driverId: "perez",
        givenName: "Sergio",
        familyName: "Perez",
        nationality: "Mexican",
      },
      Constructors: [
        {
          constructorId: "red_bull",
          name: "Red Bull",
          nationality: "Austrian",
        },
      ],
    },
  ],
  ferrari: [
    {
      position: "2",
      points: "190",
      wins: "3",
      Driver: {
        driverId: "leclerc",
        givenName: "Charles",
        familyName: "Leclerc",
        nationality: "Monegasque",
      },
      Constructors: [
        { constructorId: "ferrari", name: "Ferrari", nationality: "Italian" },
      ],
    },
    {
      position: "4",
      points: "160",
      wins: "1",
      Driver: {
        driverId: "sainz",
        givenName: "Carlos",
        familyName: "Sainz",
        nationality: "Spanish",
      },
      Constructors: [
        { constructorId: "ferrari", name: "Ferrari", nationality: "Italian" },
      ],
    },
  ],
  mclaren: [
    {
      position: "3",
      points: "170",
      wins: "2",
      Driver: {
        driverId: "norris",
        givenName: "Lando",
        familyName: "Norris",
        nationality: "British",
      },
      Constructors: [
        { constructorId: "mclaren", name: "McLaren", nationality: "British" },
      ],
    },
    {
      position: "6",
      points: "130",
      wins: "0",
      Driver: {
        driverId: "piastri",
        givenName: "Oscar",
        familyName: "Piastri",
        nationality: "Australian",
      },
      Constructors: [
        { constructorId: "mclaren", name: "McLaren", nationality: "British" },
      ],
    },
  ],
};

const buildRaceResult = (constructorId: string, position: string) => ({
  position,
  points: "0",
  Driver: {
    driverId: `${constructorId}_${position}`,
    givenName: "Sample",
    familyName: `Driver ${position}`,
  },
  Constructor: {
    constructorId,
    name:
      sampleConstructors.find(
        (team) => team.Constructor.constructorId === constructorId
      )?.Constructor.name ?? constructorId,
  },
});

const sampleRaceResultsByConstructor = {
  red_bull: ["1", "2", "3", "4"].map((position) =>
    buildRaceResult("red_bull", position)
  ),
  ferrari: ["2", "4", "5"].map((position) =>
    buildRaceResult("ferrari", position)
  ),
  mclaren: ["3", "5"].map((position) => buildRaceResult("mclaren", position)),
};

const renderAtComparison = async (
  initialPath: string = "/constructor-comparison"
) =>
  renderWithRouter({
    initialPath,
    routes: [
      {
        path: "/constructor-comparison",
        element: <ConstructorComparison />,
        validateSearch: validateConstructorComparisonSearch,
      },
      {
        path: "/constructor/$id",
        element: <div data-testid="constructor-page" />,
      },
      { path: "/driver/$id", element: <div data-testid="driver-page" /> },
    ],
  });

describe("ConstructorComparison", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    useConstructorStandingsMock.mockReset();
    useConstructorStandingsTimelineMock.mockReset();
    useConstructorRaceResultsMock.mockReset();
    useDriversByConstructorMock.mockReset();

    useConstructorStandingsMock.mockReturnValue({
      data: sampleConstructors,
      isLoading: false,
      error: null,
    });
    useDriversByConstructorMock.mockImplementation(
      (constructorId?: string) => ({
        data:
          sampleDriversByConstructor[
            constructorId as keyof typeof sampleDriversByConstructor
          ] ?? [],
        isLoading: false,
        error: null,
      })
    );
    useConstructorStandingsTimelineMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    useConstructorRaceResultsMock.mockImplementation(
      (constructorId?: string) => ({
        data:
          sampleRaceResultsByConstructor[
            constructorId as keyof typeof sampleRaceResultsByConstructor
          ] ?? [],
        isLoading: false,
        error: null,
      })
    );
  });

  it("renders the skeleton while standings are loading", async () => {
    useConstructorStandingsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    await renderAtComparison();

    expect(
      screen.getByTestId("constructor-comparison-page-skeleton")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/loading constructor comparison/i, { selector: ".sr-only" })
    ).toBeInTheDocument();
  });

  it("renders the default comparison from the top two constructors", async () => {
    const { router } = await renderAtComparison();

    expect(
      await screen.findByRole("heading", {
        name: /compare constructors side by side/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Constructor one")).toHaveValue("red_bull");
    expect(screen.getByLabelText("Constructor two")).toHaveValue("ferrari");
    expect(screen.getByText("Red Bull vs Ferrari")).toBeInTheDocument();
    expect(
      screen.getByText("Red Bull leads by 150 points")
    ).toBeInTheDocument();
    expect(screen.getByText("Podium finishes")).toBeInTheDocument();
    expect(screen.getByText("3 podiums")).toBeInTheDocument();
    expect(screen.getByText("1 podium")).toBeInTheDocument();
    expect(screen.getByText("Verstappen · 300 pts")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /view profile/i })[0]
    ).toHaveAttribute("href", "/constructor/red_bull");
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        constructor1: "red_bull",
        constructor2: "ferrari",
      })
    );
  });

  it("renders localized Spanish content", async () => {
    await i18n.changeLanguage("es");

    await renderAtComparison();

    expect(
      await screen.findByRole("heading", {
        name: /compara constructores lado a lado/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Constructor uno")).toHaveValue("red_bull");
    expect(screen.getByLabelText("Constructor dos")).toHaveValue("ferrari");
    expect(
      screen.getByText("Red Bull aventaja por 150 puntos")
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /ver perfil/i })[0]
    ).toHaveAttribute("href", "/constructor/red_bull");
    expect(
      screen.getByRole("button", { name: /compartir comparación/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /fortalezas del equipo/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /progresión de puntos/i })
    ).toBeInTheDocument();
  });

  it("updates the comparison when a different constructor is selected", async () => {
    const { router } = await renderAtComparison(
      "/constructor-comparison?season=2023"
    );

    fireEvent.change(await screen.findByLabelText("Constructor two"), {
      target: { value: "mclaren" },
    });

    await waitFor(() =>
      expect(screen.getByText("Red Bull vs McLaren")).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Constructor two")).toHaveValue("mclaren");
    expect(
      screen.getByText("Red Bull leads by 200 points")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        season: "2023",
        constructor1: "red_bull",
        constructor2: "mclaren",
      })
    );
  });

  it("hydrates the selected constructors from URL search params", async () => {
    await renderAtComparison(
      "/constructor-comparison?constructor1=ferrari&constructor2=mclaren"
    );

    expect(await screen.findByText("Ferrari vs McLaren")).toBeInTheDocument();
    expect(screen.getByLabelText("Constructor one")).toHaveValue("ferrari");
    expect(screen.getByLabelText("Constructor two")).toHaveValue("mclaren");
  });

  it("renders a statistical radar chart for constructor strengths", async () => {
    await renderAtComparison("/constructor-comparison?season=2023");

    expect(
      await screen.findByRole("heading", { name: /team strengths/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /red bull and ferrari 2023 constructor strength radar chart/i,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Championship rank")).toHaveLength(2);
    expect(screen.getAllByText("Recent form")).toHaveLength(2);
    expect(screen.getAllByText("Consistency")).toHaveLength(2);
    expect(await screen.findByText(/500 pts recent/i)).toBeInTheDocument();
    expect(screen.getByText(/350 pts recent/i)).toBeInTheDocument();
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

    await renderAtComparison(
      "/constructor-comparison?season=2023&constructor1=ferrari&constructor2=mclaren"
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /share comparison/i })
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedUrl = writeText.mock.calls[0][0];
    expect(copiedUrl).toContain("/constructor-comparison?");
    expect(copiedUrl).toContain("season=2023");
    expect(copiedUrl).toContain("constructor1=ferrari");
    expect(copiedUrl).toContain("constructor2=mclaren");
    expect(
      screen.getByText("Comparison link copied to clipboard.")
    ).toBeInTheDocument();
  });

  it("renders an empty state when fewer than two constructors are available", async () => {
    useConstructorStandingsMock.mockReturnValue({
      data: [sampleConstructors[0]],
      isLoading: false,
      error: null,
    });

    await renderAtComparison();

    expect(
      await screen.findByRole("heading", {
        name: /not enough constructors to compare/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Constructor one")).not.toBeInTheDocument();
  });

  it("sets the document title", async () => {
    await renderAtComparison();

    await waitFor(() => expect(document.title).toBe("Constructor Comparison"));
  });
});
