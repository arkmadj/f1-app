import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import driversService from "./testapi";

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
    expect(axios.get).toHaveBeenCalledWith("/2024/driverStandings.json");
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

  it("getDriverStandingsTimeline combines races with available round standings", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          MRData: {
            RaceTable: {
              Races: [
                {
                  season: "2024",
                  round: "1",
                  raceName: "Bahrain Grand Prix",
                  date: "2024-03-02",
                },
                {
                  season: "2024",
                  round: "2",
                  raceName: "Saudi Arabian Grand Prix",
                  date: "2024-03-09",
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
                  season: "2024",
                  round: "1",
                  DriverStandings: [{ points: "25" }],
                },
              ],
            },
          },
        },
      })
      .mockRejectedValueOnce(new Error("Round unavailable"));

    const timeline = await driversService.getDriverStandingsTimeline();

    expect(axios.get).toHaveBeenNthCalledWith(1, "/2024.json");
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "/2024/1/driverStandings.json"
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      3,
      "/2024/2/driverStandings.json"
    );
    expect(timeline).toEqual([
      {
        season: "2024",
        round: "1",
        raceName: "Bahrain Grand Prix",
        date: "2024-03-02",
        DriverStandings: [{ points: "25" }],
      },
    ]);
  });

  it("getbyId requests the Jolpica drivers endpoint", async () => {
    axios.get.mockResolvedValueOnce({ data: { driver: "verstappen" } });

    const data = await driversService.getbyId("max_verstappen");

    expect(axios.get).toHaveBeenCalledWith("/2024/drivers/max_verstappen.json");
    expect(data).toEqual({ driver: "verstappen" });
  });
});
