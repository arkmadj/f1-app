import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { DEFAULT_SEASON } from "../../domain/f1/seasons";
import {
  getCurrentSeasonRaces,
  getCircuitPodiumFinishers,
  getCircuitRaceWinners,
  getConstructorRaceResults,
  getDriverRaceResults,
  getDriverSeasonQualifyingResults,
  getRacePitStops,
  getRaceResults,
  getSprintResults,
  getRaces,
  getSprintRaces,
  getQualifyingResults,
  getAllQualifyingResults,
  getLastRaceResults,
  getRaceInfo,
  getRaceLapTimings,
} from "./racesApi";

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

const racesPayload = (races) => ({
  data: { MRData: { RaceTable: { Races: races } } },
});

describe("services/api/racesApi", () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it("getCurrentSeasonRaces hits the default season endpoint", async () => {
    axios.get.mockResolvedValueOnce(racesPayload([{ round: "1" }]));

    const races = await getCurrentSeasonRaces();

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}.json`);
    expect(races).toEqual([{ round: "1" }]);
  });

  it("getCurrentSeasonRaces supports an explicit season", async () => {
    axios.get.mockResolvedValueOnce(racesPayload([{ round: "2" }]));

    const races = await getCurrentSeasonRaces("2023");

    expect(axios.get).toHaveBeenCalledWith("/2023.json");
    expect(races).toEqual([{ round: "2" }]);
  });

  it("getRaceResults hits the default season results endpoint", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([{ Results: [{ position: "1" }] }])
    );

    const results = await getRaceResults("3");

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/3/results.json`);
    expect(results).toEqual([{ position: "1" }]);
  });

  it("getRacePitStops hits the default season pit stops endpoint", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([{ PitStops: [{ driverId: "norris", duration: "2.211" }] }])
    );

    const pitStops = await getRacePitStops("3");

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/3/pitstops.json`);
    expect(pitStops).toEqual([{ driverId: "norris", duration: "2.211" }]);
  });

  it("getRaceLapTimings hits the default season lap timings endpoint", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([
        { Laps: [{ number: "1", Timings: [{ driverId: "norris", position: "4" }] }] },
      ])
    );

    const laps = await getRaceLapTimings("3");

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/3/laps.json`);
    expect(laps).toEqual([
      { number: "1", Timings: [{ driverId: "norris", position: "4" }] },
    ]);
  });

  it("getCircuitRaceWinners hits the all-time circuit winners endpoint", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([{ season: "2024", Results: [{ position: "1" }] }])
    );

    const winners = await getCircuitRaceWinners("monza");

    expect(axios.get).toHaveBeenCalledWith(
      "/circuits/monza/results/1.json?limit=100"
    );
    expect(winners).toEqual([{ season: "2024", Results: [{ position: "1" }] }]);
  });

  it("getCircuitPodiumFinishers hits all top-three circuit result endpoints", async () => {
    axios.get
      .mockResolvedValueOnce(
        racesPayload([{ season: "2024", Results: [{ position: "1" }] }])
      )
      .mockResolvedValueOnce(
        racesPayload([{ season: "2024", Results: [{ position: "2" }] }])
      )
      .mockResolvedValueOnce(
        racesPayload([{ season: "2024", Results: [{ position: "3" }] }])
      );

    const podiumFinishers = await getCircuitPodiumFinishers("monza");

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      "/circuits/monza/results/1.json?limit=100"
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "/circuits/monza/results/2.json?limit=100"
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      3,
      "/circuits/monza/results/3.json?limit=100"
    );
    expect(podiumFinishers).toEqual([
      { season: "2024", Results: [{ position: "1" }] },
      { season: "2024", Results: [{ position: "2" }] },
      { season: "2024", Results: [{ position: "3" }] },
    ]);
  });

  it("getDriverRaceResults hits the driver results endpoint and keeps race metadata", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([
        {
          season: "2024",
          round: "1",
          raceName: "Bahrain Grand Prix",
          date: "2024-03-02",
          Results: [{ position: "4" }],
        },
        {
          season: "2024",
          round: "2",
          raceName: "Saudi Arabian Grand Prix",
          date: "2024-03-09",
          Results: [{ position: "2" }],
        },
      ])
    );

    const results = await getDriverRaceResults("norris", "2024");

    expect(axios.get).toHaveBeenCalledWith("/2024/drivers/norris/results.json");
    expect(results).toEqual([
      {
        season: "2024",
        round: "1",
        raceName: "Bahrain Grand Prix",
        date: "2024-03-02",
        position: "4",
      },
      {
        season: "2024",
        round: "2",
        raceName: "Saudi Arabian Grand Prix",
        date: "2024-03-09",
        position: "2",
      },
    ]);
  });

  it("getConstructorRaceResults hits the constructor results endpoint and flattens race results", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([
        { round: "1", Results: [{ position: "1" }] },
        { round: "2", Results: [{ position: "3" }] },
      ])
    );

    const results = await getConstructorRaceResults("red_bull", "2024");

    expect(axios.get).toHaveBeenCalledWith(
      "/2024/constructors/red_bull/results.json"
    );
    expect(results).toEqual([{ position: "1" }, { position: "3" }]);
  });

  it("getSprintResults hits the default season sprint endpoint", async () => {
    axios.get.mockResolvedValueOnce(
      racesPayload([{ SprintResults: [{ position: "2" }] }])
    );

    const results = await getSprintResults("4");

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/4/sprint.json`);
    expect(results).toEqual([{ position: "2" }]);
  });

  it("getRaces hits the default season endpoint", async () => {
    axios.get.mockResolvedValueOnce(racesPayload([{ round: "2" }]));

    await getRaces();

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}.json`);
  });

  it("getSprintRaces hits the default season sprint endpoint", async () => {
    axios.get.mockResolvedValueOnce(racesPayload([]));

    await getSprintRaces();

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/sprint.json`);
  });

  it("getLastRaceResults hits the default season last/results endpoint", async () => {
    axios.get.mockResolvedValueOnce(racesPayload([{ Results: [{ p: 1 }] }]));

    await getLastRaceResults();

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/last/results.json`);
  });

  it("getRaceInfo hits the default season last/results endpoint", async () => {
    axios.get.mockResolvedValueOnce(racesPayload([{ raceName: "GP" }]));

    const info = await getRaceInfo();

    expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/last/results.json`);
    expect(info).toEqual({ raceName: "GP" });
  });

  it("getRaceResults rethrows on failure", async () => {
    const err = new Error("boom");
    axios.get.mockRejectedValueOnce(err);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getRaceResults("1")).rejects.toBe(err);

    spy.mockRestore();
  });

  describe("qualifying endpoints", () => {
    it("getQualifyingResults hits the Jolpica qualifying endpoint", async () => {
      axios.get.mockResolvedValueOnce(
        racesPayload([{ QualifyingResults: [{ position: "1" }] }])
      );

      const result = await getQualifyingResults("5");

      expect(axios.get).toHaveBeenCalledWith(`/${DEFAULT_SEASON}/5/qualifying.json`);
      expect(result).toEqual([{ position: "1" }]);
    });

    it("getQualifyingResults returns an empty array when the round has no Races", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      const result = await getQualifyingResults("99");

      expect(result).toEqual([]);
    });

    it("getAllQualifyingResults composes Jolpica calls", async () => {
      axios.get
        .mockResolvedValueOnce(racesPayload([{ round: "1" }]))
        .mockResolvedValueOnce(
          racesPayload([{ QualifyingResults: [{ position: "1" }] }])
        );

      const results = await getAllQualifyingResults();

      expect(axios.get).toHaveBeenNthCalledWith(1, `/${DEFAULT_SEASON}.json`);
      expect(axios.get).toHaveBeenNthCalledWith(2, `/${DEFAULT_SEASON}/1/qualifying.json`);
      expect(results).toEqual([{ round: "1", results: [{ position: "1" }] }]);
    });
  });

  describe("safe-default fallbacks", () => {
    it("getCurrentSeasonRaces returns an empty array when MRData is missing", async () => {
      axios.get.mockResolvedValueOnce({ data: {} });

      await expect(getCurrentSeasonRaces()).resolves.toEqual([]);
    });

    it("getRaceResults returns an empty array when no Races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      await expect(getRaceResults("1")).resolves.toEqual([]);
    });

    it("getRacePitStops returns an empty array when no Races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      await expect(getRacePitStops("1")).resolves.toEqual([]);
    });

    it("getRaceLapTimings returns an empty array when no Races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      await expect(getRaceLapTimings("1")).resolves.toEqual([]);
    });

    it("getSprintResults returns an empty array when no Races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      await expect(getSprintResults("1")).resolves.toEqual([]);
    });

    it("getLastRaceResults returns an empty array when no Races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      await expect(getLastRaceResults()).resolves.toEqual([]);
    });

    it("getRaceInfo returns undefined when no Races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      await expect(getRaceInfo()).resolves.toBeUndefined();
    });
  });

  describe("getDriverSeasonQualifyingResults", () => {
    it("fetches driver qualifying results for a season in a single request", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          MRData: {
            RaceTable: {
              Races: [
                {
                  season: "2024",
                  round: "1",
                  raceName: "Bahrain Grand Prix",
                  date: "2024-03-02",
                  Circuit: { circuitId: "bahrain", circuitName: "Bahrain International Circuit", Location: {} },
                  QualifyingResults: [
                    { position: "1", Driver: { driverId: "max_verstappen" }, Constructor: { constructorId: "red_bull" }, Q1: "1:29.000", Q2: "1:28.000", Q3: "1:27.900" },
                  ],
                },
                {
                  season: "2024",
                  round: "2",
                  raceName: "Saudi Arabian Grand Prix",
                  date: "2024-03-09",
                  Circuit: { circuitId: "jeddah", circuitName: "Jeddah Corniche Circuit", Location: {} },
                  QualifyingResults: [
                    { position: "2", Driver: { driverId: "max_verstappen" }, Constructor: { constructorId: "red_bull" }, Q1: "1:28.500", Q2: "1:27.800", Q3: "1:27.472" },
                  ],
                },
              ],
            },
          },
        },
      });

      const result = await getDriverSeasonQualifyingResults("max_verstappen", "2024");

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        "/2024/drivers/max_verstappen/qualifying.json?limit=100"
      );
      expect(result).toHaveLength(2);
      expect(result[0].round).toBe("1");
      expect(result[0].results[0].Driver.driverId).toBe("max_verstappen");
      expect(result[1].round).toBe("2");
      expect(result[1].results[0].position).toBe("2");
    });

    it("returns an empty array when no races are returned", async () => {
      axios.get.mockResolvedValueOnce(racesPayload([]));

      const result = await getDriverSeasonQualifyingResults("max_verstappen", "2024");

      expect(result).toEqual([]);
    });
  });
});
