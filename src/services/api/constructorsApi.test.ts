import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import teamsService from "./constructorsApi";

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
    expect(axios.get).toHaveBeenCalledWith("/2024/constructorStandings.json");
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

  it("getConstructorStandingsTimeline combines the race calendar with round standings", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          MRData: {
            RaceTable: {
              Races: [
                {
                  season: "2023",
                  round: "1",
                  raceName: "Bahrain GP",
                  date: "2023-03-05",
                },
                {
                  season: "2023",
                  round: "2",
                  raceName: "Saudi Arabian GP",
                  date: "2023-03-19",
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          MRData: {
            StandingsTable: {
              StandingsLists: [
                {
                  season: "2023",
                  round: "1",
                  ConstructorStandings: [
                    {
                      points: "43",
                      Constructor: { constructorId: "red_bull" },
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
            StandingsTable: {
              StandingsLists: [
                {
                  season: "2023",
                  round: "2",
                  ConstructorStandings: [
                    {
                      points: "87",
                      Constructor: { constructorId: "red_bull" },
                    },
                  ],
                },
              ],
            },
          },
        },
      });

    const timeline = await teamsService.getConstructorStandingsTimeline("2023");

    expect(axios.get).toHaveBeenNthCalledWith(1, "/2023.json");
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "/2023/1/constructorStandings.json"
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      3,
      "/2023/2/constructorStandings.json"
    );
    expect(timeline).toEqual([
      {
        season: "2023",
        round: "1",
        raceName: "Bahrain GP",
        date: "2023-03-05",
        ConstructorStandings: [
          { points: "43", Constructor: { constructorId: "red_bull" } },
        ],
      },
      {
        season: "2023",
        round: "2",
        raceName: "Saudi Arabian GP",
        date: "2023-03-19",
        ConstructorStandings: [
          { points: "87", Constructor: { constructorId: "red_bull" } },
        ],
      },
    ]);
  });

  it("getbyId requests the Jolpica constructors endpoint", async () => {
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    const data = await teamsService.getbyId("ferrari");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith("/2024/constructors/ferrari.json");
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

    expect(axios.get).toHaveBeenCalledWith("/2024/driverStandings.json");
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
    expect(axios.get).toHaveBeenCalledWith("/2024/driverStandings.json");

    spy.mockRestore();
  });
});
