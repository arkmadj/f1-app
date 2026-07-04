import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import RaceCountdown from "./RaceCountDown";
import { getCurrentSeasonRaces } from "../../services/api/racesApi";
import type { ErgastRace } from "../../services/api/racesApi";

// Drive the API service deterministically so the countdown logic can be
// exercised without touching the network. The component consumes the
// service through the `useCurrentSeasonRaces` React Query hook, so the
// mock is sufficient to control every cache transition.
vi.mock("../../services/api/racesApi", () => ({
  getCurrentSeasonRaces: vi.fn(),
}));

vi.mock("../../hooks/useSelectedSeason", () => ({
  useSelectedSeason: () => ({
    selectedSeason: "2024",
    setSelectedSeason: () => undefined,
  }),
}));

const mockedGetCurrentSeasonRaces = vi.mocked(getCurrentSeasonRaces);

// Each test renders with a fresh QueryClient that disables retries and
// surfaces errors via `isError` (rather than throwing) so the component's
// own UI branches can be asserted.
const renderWithClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, throwOnError: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

interface BuildRaceOptions {
  round?: string;
  raceName?: string;
  date: string;
  time?: string;
}

const buildRace = ({
  round = "1",
  raceName = "Test GP",
  date,
  time,
}: BuildRaceOptions): ErgastRace => ({
  season: "2024",
  round,
  raceName,
  date,
  ...(time !== undefined ? { time } : {}),
  Circuit: {
    circuitId: `circuit-${round}`,
    circuitName: `${raceName} Circuit`,
    Location: { locality: "Test City", country: "Testland" },
  },
});

// Mirrors the component helpers so expected strings are computed from the
// same UTC timestamps while still formatting in the runner's local timezone.
const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;
const DEFAULT_RACE_TIME = "00:00:00Z";

const parseRaceStartTime = (race: ErgastRace): Date =>
  new Date(`${race.date}T${race.time ?? DEFAULT_RACE_TIME}`);

const formatLocalSessionTime = (race: ErgastRace): string => {
  const raceStartTime = parseRaceStartTime(race);

  if (!race.time) {
    return `${new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(raceStartTime)} · Time TBD`;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(raceStartTime);
};

const getUserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Your local timezone";

const formatExpected = (race: ErgastRace, now: Date): string => {
  const diff = parseRaceStartTime(race).getTime() - now.getTime();
  if (diff <= 0) return "Race is starting now!";
  const days = Math.floor(diff / MS_IN_DAY);
  const hours = Math.floor((diff % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((diff % MS_IN_HOUR) / MS_IN_MINUTE);
  const seconds = Math.floor((diff % MS_IN_MINUTE) / MS_IN_SECOND);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Lets the fetch microtask resolve and React commit any resulting
// state updates while fake timers are installed. TanStack Query
// schedules subscriber notifications via setTimeout(fn, 0), so we
// also advance pending zero-delay timers to drain that queue.
const flushPromises = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
  });
};

const NOW = new Date("2024-06-01T12:00:00Z");

describe("RaceCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockedGetCurrentSeasonRaces.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders the loading message while the API request is pending", () => {
      mockedGetCurrentSeasonRaces.mockReturnValue(new Promise(() => {}));

      renderWithClient(<RaceCountdown />);

      expect(screen.getByText("Loading next race...")).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Next Race" })
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+d \d+h/)).not.toBeInTheDocument();
    });

    it("renders the empty-state message when no races are returned", async () => {
      mockedGetCurrentSeasonRaces.mockResolvedValue([]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("No upcoming races.")).toBeInTheDocument();
      expect(
        screen.queryByText("Loading next race...")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Next Race" })
      ).not.toBeInTheDocument();
    });

    it("renders the empty-state message when every race is in the past", async () => {
      mockedGetCurrentSeasonRaces.mockResolvedValue([
        buildRace({
          round: "1",
          raceName: "Past A",
          date: "2020-03-01",
          time: "14:00:00Z",
        }),
        buildRace({
          round: "2",
          raceName: "Past B",
          date: "2021-04-01",
          time: "14:00:00Z",
        }),
      ]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("No upcoming races.")).toBeInTheDocument();
      expect(screen.queryByText("Past A")).not.toBeInTheDocument();
      expect(screen.queryByText("Past B")).not.toBeInTheDocument();
    });

    it("renders the next race heading, name and countdown when an upcoming race exists", async () => {
      const race = buildRace({
        raceName: "Future GP",
        date: "2024-12-01",
        time: "14:00:00Z",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(
        screen.getByRole("heading", { name: "Next Race · 2024" })
      ).toBeInTheDocument();
      expect(screen.getByText("Future GP")).toBeInTheDocument();
      expect(
        screen.getByText(`Local session time · ${getUserTimeZone()}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(formatLocalSessionTime(race))
      ).toBeInTheDocument();
      expect(screen.getByText(formatExpected(race, NOW))).toBeInTheDocument();
      expect(
        screen.queryByText("Loading next race...")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("No upcoming races.")).not.toBeInTheDocument();
    });

    it("renders translated labels when the selected language changes", async () => {
      await i18n.changeLanguage("es");
      const race = buildRace({
        raceName: "Future GP",
        date: "2024-12-01",
        time: "14:00:00Z",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(
        screen.getByRole("heading", { name: "Próxima carrera · 2024" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(`Hora local de la sesión · ${getUserTimeZone()}`)
      ).toBeInTheDocument();
    });
  });

  describe("upcoming race selection", () => {
    it("picks the first race in the future and ignores past or later races", async () => {
      const past = buildRace({
        round: "1",
        raceName: "Past GP",
        date: "2020-01-01",
        time: "14:00:00Z",
      });
      const upcoming = buildRace({
        round: "2",
        raceName: "Upcoming GP",
        date: "2024-12-01",
        time: "14:00:00Z",
      });
      const later = buildRace({
        round: "3",
        raceName: "Later GP",
        date: "2025-12-01",
        time: "14:00:00Z",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([past, upcoming, later]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("Upcoming GP")).toBeInTheDocument();
      expect(screen.queryByText("Past GP")).not.toBeInTheDocument();
      expect(screen.queryByText("Later GP")).not.toBeInTheDocument();
    });

    it("defaults to 00:00:00Z when the race has no time and still computes a countdown", async () => {
      const race = buildRace({
        raceName: "Timeless GP",
        date: "2024-12-01",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("Timeless GP")).toBeInTheDocument();
      expect(
        screen.getByText(formatLocalSessionTime(race))
      ).toBeInTheDocument();
      expect(screen.getByText(formatExpected(race, NOW))).toBeInTheDocument();
    });
  });

  describe("timing logic", () => {
    it("updates the countdown each second as fake timers advance", async () => {
      const race = buildRace({
        raceName: "Future GP",
        date: "2024-12-01",
        time: "14:00:00Z",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText(formatExpected(race, NOW))).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(MS_IN_SECOND);
      });
      expect(
        screen.getByText(
          formatExpected(race, new Date(NOW.getTime() + MS_IN_SECOND))
        )
      ).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(60 * MS_IN_SECOND);
      });
      expect(
        screen.getByText(
          formatExpected(race, new Date(NOW.getTime() + 61 * MS_IN_SECOND))
        )
      ).toBeInTheDocument();
    });

    it("renders the starting-now message and stops ticking once the countdown reaches zero", async () => {
      const startIso = new Date(NOW.getTime() + 2 * MS_IN_SECOND).toISOString();
      const race = buildRace({
        raceName: "Imminent GP",
        date: startIso.slice(0, 10),
        time: `${startIso.slice(11, 19)}Z`,
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("0d 0h 0m 2s")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(MS_IN_SECOND);
      });
      expect(screen.getByText("0d 0h 0m 1s")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(MS_IN_SECOND);
      });
      expect(screen.getByText("Race is starting now!")).toBeInTheDocument();

      // Once the countdown hits zero the interval is cleared, so further
      // time advances must not produce any additional ticks/changes.
      await act(async () => {
        vi.advanceTimersByTime(10 * MS_IN_SECOND);
      });
      expect(screen.getByText("Race is starting now!")).toBeInTheDocument();
    });

    it("clears the countdown interval when the component unmounts", async () => {
      const race = buildRace({
        raceName: "Future GP",
        date: "2024-12-01",
        time: "14:00:00Z",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race]);

      // Capture the interval id created by the countdown effect and
      // assert it is passed to clearInterval on unmount. This is a more
      // targeted invariant than the global pending-timer count, which
      // TanStack Query also contributes to via its own scheduling.
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const { unmount } = renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(setIntervalSpy).toHaveBeenCalled();
      const countdownIntervalId =
        setIntervalSpy.mock.results[setIntervalSpy.mock.results.length - 1]
          .value;

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalledWith(countdownIntervalId);
    });
  });

  describe("error and edge cases", () => {
    it("falls back to the empty-state message when the query errors", async () => {
      mockedGetCurrentSeasonRaces.mockRejectedValue(new Error("network down"));

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("No upcoming races.")).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Next Race" })
      ).not.toBeInTheDocument();
    });

    it("treats a race scheduled exactly at the current moment as already started", async () => {
      const startIso = NOW.toISOString();
      const race = buildRace({
        raceName: "Right Now GP",
        date: startIso.slice(0, 10),
        time: `${startIso.slice(11, 19)}Z`,
      });
      // Place a future race after it; the component must still skip the
      // simultaneous race (strictly greater-than comparison) and pick
      // the next one.
      const later = buildRace({
        round: "2",
        raceName: "Later GP",
        date: "2024-12-01",
        time: "14:00:00Z",
      });
      mockedGetCurrentSeasonRaces.mockResolvedValue([race, later]);

      renderWithClient(<RaceCountdown />);
      await flushPromises();

      expect(screen.getByText("Later GP")).toBeInTheDocument();
      expect(screen.queryByText("Right Now GP")).not.toBeInTheDocument();
    });
  });
});
