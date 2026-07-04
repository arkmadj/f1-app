import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import driversService from "./testapi";
import { DEFAULT_SEASON } from "../../domain/f1/seasons";

vi.mock("axios", () => {
  const get = vi.fn();
  const post = vi.fn();
  const interceptors = { response: { use: vi.fn() } };
  return {
    default: {
      get,
      post,
      create: vi.fn(() => ({ get, post, interceptors })),
      isAxiosError: vi.fn((error: unknown) =>
        Boolean((error as { isAxiosError?: boolean }).isAxiosError)
      ),
    },
  };
});

describe("services/api/testapi (driversService)", () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it("getDriverStandings requests the Jolpica driver standings endpoint", async () => {
    axios.get.mockResolvedValueOnce({ data: { standings: [] } });

    const data = await driversService.getDriverStandings();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/driverStandings.json`);
    expect(data).toEqual({ standings: [] });
  });

  it("getDriverStandings supports an explicit season", async () => {
    axios.get.mockResolvedValueOnce({ data: { standings: [] } });

    await driversService.getDriverStandings("2021");

    expect(axios.get).toHaveBeenCalledWith("/2021/driverStandings.json");
  });

  it("getDriverStandingsByRound requests the round standings endpoint", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        MRData: {
          StandingsTable: {
            StandingsLists: [{ round: "4", DriverStandings: [] }],
          },
        },
      },
    });

    const standings = await driversService.getDriverStandingsByRound(
      "4",
      "2021"
    );

    expect(axios.get).toHaveBeenCalledWith("/2021/4/driverStandings.json");
    expect(standings).toEqual({ round: "4", DriverStandings: [] });
  });

  it("getDriverStandingsTimeline derives cumulative standings from bulk results", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          MRData: {
            total: "4",
            RaceTable: {
              Races: [
                {
                  season: "2024",
                  round: "1",
                  raceName: "Bahrain Grand Prix",
                  date: "2024-03-02",
                  Results: [
                    {
                      position: "1",
                      points: "25",
                      Driver: { driverId: "max_verstappen" },
                      Constructor: { constructorId: "red_bull" },
                    },
                    {
                      position: "2",
                      points: "18",
                      Driver: { driverId: "leclerc" },
                      Constructor: { constructorId: "ferrari" },
                    },
                  ],
                },
                {
                  season: "2024",
                  round: "2",
                  raceName: "Saudi Arabian Grand Prix",
                  date: "2024-03-09",
                  Results: [
                    {
                      position: "1",
                      points: "25",
                      Driver: { driverId: "max_verstappen" },
                      Constructor: { constructorId: "red_bull" },
                    },
                    {
                      position: "2",
                      points: "18",
                      Driver: { driverId: "leclerc" },
                      Constructor: { constructorId: "ferrari" },
                    },
                  ],
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { MRData: { total: "0", RaceTable: { Races: [] } } },
      });

    const timeline = await driversService.getDriverStandingsTimeline("2024");

    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(
      "/2024/results.json?limit=100&offset=0"
    );
    expect(axios.get).toHaveBeenCalledWith(
      "/2024/sprint.json?limit=100&offset=0"
    );
    expect(timeline).toEqual([
      {
        season: "2024",
        round: "1",
        raceName: "Bahrain Grand Prix",
        date: "2024-03-02",
        DriverStandings: [
          {
            position: "1",
            positionText: "1",
            points: "25",
            wins: "1",
            Driver: { driverId: "max_verstappen" },
            Constructors: [{ constructorId: "red_bull", nationality: "" }],
          },
          {
            position: "2",
            positionText: "2",
            points: "18",
            wins: "0",
            Driver: { driverId: "leclerc" },
            Constructors: [{ constructorId: "ferrari", nationality: "" }],
          },
        ],
      },
      {
        season: "2024",
        round: "2",
        raceName: "Saudi Arabian Grand Prix",
        date: "2024-03-09",
        DriverStandings: [
          {
            position: "1",
            positionText: "1",
            points: "50",
            wins: "2",
            Driver: { driverId: "max_verstappen" },
            Constructors: [{ constructorId: "red_bull", nationality: "" }],
          },
          {
            position: "2",
            positionText: "2",
            points: "36",
            wins: "0",
            Driver: { driverId: "leclerc" },
            Constructors: [{ constructorId: "ferrari", nationality: "" }],
          },
        ],
      },
    ]);
  });

  it("getAllDriverSeasonStandings fetches all-season standings in a single request", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        MRData: {
          total: "2",
          StandingsTable: {
            driverId: "max_verstappen",
            StandingsLists: [
              {
                season: "2024",
                round: "24",
                DriverStandings: [
                  { position: "1", positionText: "1", points: "437", wins: "9", Driver: { driverId: "max_verstappen", givenName: "Max", familyName: "Verstappen" }, Constructors: [] },
                ],
              },
              {
                season: "2023",
                round: "22",
                DriverStandings: [
                  { position: "1", positionText: "1", points: "575", wins: "19", Driver: { driverId: "max_verstappen", givenName: "Max", familyName: "Verstappen" }, Constructors: [] },
                ],
              },
            ],
          },
        },
      },
    });

    const result = await driversService.getAllDriverSeasonStandings("max_verstappen");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "/drivers/max_verstappen/driverStandings.json?limit=100"
    );
    expect(result).toHaveLength(2);
    expect(result[0].season).toBe("2024");
    expect(result[0].DriverStandings[0].position).toBe("1");
    expect(result[1].season).toBe("2023");
  });

  it("getbyId requests the Jolpica drivers endpoint", async () => {
    axios.get.mockResolvedValueOnce({ data: { driver: "verstappen" } });

    const data = await driversService.getbyId("max_verstappen");

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/drivers/max_verstappen.json`);
    expect(data).toEqual({ driver: "verstappen" });
  });
});
