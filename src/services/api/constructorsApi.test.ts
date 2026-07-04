import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import teamsService from "./constructorsApi";
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

describe("services/api/constructorsApi", () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it("getAll requests the default season constructor standings endpoint", async () => {
    axios.get.mockResolvedValueOnce({
      data: { MRData: { StandingsTable: {} } },
    });

    const data = await teamsService.getAll();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/constructorStandings.json`);
    expect(data).toEqual({ MRData: { StandingsTable: {} } });
  });

  it("getAll supports an explicit season", async () => {
    axios.get.mockResolvedValueOnce({
      data: { MRData: { StandingsTable: {} } },
    });

    await teamsService.getAll("2022");

    expect(axios.get).toHaveBeenCalledWith("/2022/constructorStandings.json");
  });

  it("getConstructorStandingsByRound requests round constructor standings", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        MRData: {
          StandingsTable: {
            StandingsLists: [
              {
                season: "2023",
                round: "4",
                ConstructorStandings: [
                  { Constructor: { constructorId: "ferrari" } },
                ],
              },
            ],
          },
        },
      },
    });

    const standings = await teamsService.getConstructorStandingsByRound(
      4,
      "2023"
    );

    expect(axios.get).toHaveBeenCalledWith("/2023/4/constructorStandings.json");
    expect(standings?.round).toBe("4");
  });

  it("getConstructorStandingsTimeline derives cumulative standings from bulk results", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          MRData: {
            total: "4",
            RaceTable: {
              Races: [
                {
                  season: "2023",
                  round: "1",
                  raceName: "Bahrain GP",
                  date: "2023-03-05",
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
                  season: "2023",
                  round: "2",
                  raceName: "Saudi Arabian GP",
                  date: "2023-03-19",
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
        data: {
          MRData: {
            total: "2",
            RaceTable: {
              Races: [
                {
                  season: "2023",
                  round: "2",
                  raceName: "Saudi Arabian GP",
                  date: "2023-03-19",
                  SprintResults: [
                    {
                      position: "1",
                      points: "8",
                      Driver: { driverId: "max_verstappen" },
                      Constructor: { constructorId: "red_bull" },
                    },
                    {
                      position: "2",
                      points: "7",
                      Driver: { driverId: "leclerc" },
                      Constructor: { constructorId: "ferrari" },
                    },
                  ],
                },
              ],
            },
          },
        },
      });

    const timeline = await teamsService.getConstructorStandingsTimeline("2023");

    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(
      "/2023/results.json?limit=100&offset=0"
    );
    expect(axios.get).toHaveBeenCalledWith(
      "/2023/sprint.json?limit=100&offset=0"
    );
    expect(timeline).toEqual([
      {
        season: "2023",
        round: "1",
        raceName: "Bahrain GP",
        date: "2023-03-05",
        ConstructorStandings: [
          {
            position: "1",
            positionText: "1",
            points: "25",
            wins: "1",
            Constructor: { constructorId: "red_bull", nationality: "" },
          },
          {
            position: "2",
            positionText: "2",
            points: "18",
            wins: "0",
            Constructor: { constructorId: "ferrari", nationality: "" },
          },
        ],
      },
      {
        season: "2023",
        round: "2",
        raceName: "Saudi Arabian GP",
        date: "2023-03-19",
        ConstructorStandings: [
          {
            position: "1",
            positionText: "1",
            points: "58",
            wins: "2",
            Constructor: { constructorId: "red_bull", nationality: "" },
          },
          {
            position: "2",
            positionText: "2",
            points: "43",
            wins: "0",
            Constructor: { constructorId: "ferrari", nationality: "" },
          },
        ],
      },
    ]);
  });

  it("getAllSeasonStandings fetches all-season standings in a single request", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        MRData: {
          total: "2",
          StandingsTable: {
            constructorId: "ferrari",
            StandingsLists: [
              {
                season: "2024",
                round: "24",
                ConstructorStandings: [
                  { position: "3", positionText: "3", points: "652", wins: "5", Constructor: { constructorId: "ferrari", name: "Ferrari", nationality: "Italian" } },
                ],
              },
              {
                season: "2023",
                round: "22",
                ConstructorStandings: [
                  { position: "2", positionText: "2", points: "406", wins: "0", Constructor: { constructorId: "ferrari", name: "Ferrari", nationality: "Italian" } },
                ],
              },
            ],
          },
        },
      },
    });

    const result = await teamsService.getAllSeasonStandings("ferrari");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "/constructors/ferrari/constructorStandings.json?limit=100"
    );
    expect(result).toHaveLength(2);
    expect(result[0].season).toBe("2024");
    expect(result[0].ConstructorStandings[0].position).toBe("3");
    expect(result[1].season).toBe("2023");
  });

  it("getbyId requests the Jolpica constructors endpoint", async () => {
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    const data = await teamsService.getbyId("ferrari");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/constructors/ferrari.json`);
    expect(data).toEqual({ ok: true });
  });

  it("getDriversByConstructor requests the Jolpica driver standings endpoint", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        MRData: {
          StandingsTable: {
            StandingsLists: [
              {
                DriverStandings: [
                  {
                    Driver: { driverId: "leclerc" },
                    Constructors: [{ constructorId: "ferrari" }],
                  },
                  {
                    Driver: { driverId: "hamilton" },
                    Constructors: [{ constructorId: "mercedes" }],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    const drivers = await teamsService.getDriversByConstructor("ferrari");

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/driverStandings.json`);
    expect(drivers).toHaveLength(1);
    expect(drivers[0].Driver.driverId).toBe("leclerc");
  });

  it("getDriversByConstructor surfaces axios errors", async () => {
    const err = new Error("network");
    axios.get.mockRejectedValueOnce(err);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(teamsService.getDriversByConstructor("ferrari")).rejects.toBe(
      err
    );
    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/driverStandings.json`);

    spy.mockRestore();
  });
});
