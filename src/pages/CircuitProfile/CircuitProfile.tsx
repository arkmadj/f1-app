import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import Flag from "react-world-flags";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import CircuitMap from "../../components/CircuitMap/CircuitMap";
import {
  readFavoriteCircuits,
  saveFavoriteCircuits,
} from "../../app/favoriteCircuits";
import { getCircuitLapRecordHolder } from "../../domain/f1/circuitLapRecordHolders";
import countryCode from "../../domain/f1/countryCode";
import { seasonSearchParams } from "../../domain/f1/seasons";
import {
  useCircuitPodiumFinishers,
  useCircuitPoleSitters,
  useCircuitProfile,
  useCircuitRaceWinners,
  useCurrentSeasonRaces,
} from "../../hooks/queries";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import type {
  ErgastCircuit,
  ErgastDriver,
  ErgastRace,
  RaceResult,
} from "../../services/api/racesApi";

const raceDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const raceTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

const INITIAL_PROFILE_RENDER_TIME = Date.now();
const PREVIOUS_WINNERS_LIMIT = 8;

const getRaceDate = (race: ErgastRace): Date =>
  new Date(`${race.date}T${race.time ?? "00:00:00Z"}`);

const formatRaceDate = (race: ErgastRace): string => {
  const date = getRaceDate(race);
  const dateLabel = raceDateFormatter.format(date);
  return race.time
    ? `${dateLabel} · ${raceTimeFormatter.format(date)}`
    : dateLabel;
};

const sortByRound = (races: ErgastRace[]): ErgastRace[] =>
  [...races].sort((left, right) => Number(left.round) - Number(right.round));

const sortByMostRecent = (races: ErgastRace[]): ErgastRace[] =>
  [...races].sort((left, right) => {
    const seasonDelta = Number(right.season) - Number(left.season);
    return seasonDelta || Number(right.round) - Number(left.round);
  });

const getRaceWinner = (race: ErgastRace): RaceResult | undefined =>
  race.Results?.find((result) => result.position === "1") ?? race.Results?.[0];

const getPoleSitter = (race: ErgastRace) =>
  race.QualifyingResults?.find((result) => result.position === "1") ??
  race.QualifyingResults?.[0];

const getDriverName = (driver: ErgastDriver): string =>
  [driver.givenName, driver.familyName].filter(Boolean).join(" ") ||
  driver.driverId;

const getConstructorName = (constructor: RaceResult["Constructor"]): string =>
  constructor.name || constructor.constructorId;

type CircuitRecord = {
  holder: string;
  count: number;
  isTie: boolean;
};

type CircuitRecordEntry = {
  id: string;
  name: string;
};

const buildCircuitRecord = (
  entries: CircuitRecordEntry[]
): CircuitRecord | undefined => {
  const recordCounts = new Map<string, { name: string; count: number }>();

  entries.forEach(({ id, name }) => {
    const current = recordCounts.get(id);

    recordCounts.set(id, {
      name,
      count: (current?.count ?? 0) + 1,
    });
  });

  if (recordCounts.size === 0) return undefined;

  const standings = [...recordCounts.values()].sort(
    (left, right) =>
      right.count - left.count || left.name.localeCompare(right.name)
  );
  const count = standings[0]?.count ?? 0;
  const leaders = standings
    .filter((entry) => entry.count === count)
    .map((entry) => entry.name);

  return {
    holder: leaders.join(", "),
    count,
    isTie: leaders.length > 1,
  };
};

const getCircuitWinsRecord = (
  races: ErgastRace[]
): CircuitRecord | undefined => {
  const winners = races.flatMap<CircuitRecordEntry>((race) => {
    const winner = getRaceWinner(race);
    if (!winner) return [];

    return [
      {
        id: winner.Driver.driverId,
        name: getDriverName(winner.Driver),
      },
    ];
  });

  return buildCircuitRecord(winners);
};

const getCircuitPolePositionsRecord = (
  races: ErgastRace[]
): CircuitRecord | undefined => {
  const poleSitters = races.flatMap<CircuitRecordEntry>((race) => {
    const poleSitter = getPoleSitter(race);
    if (!poleSitter) return [];

    return [
      {
        id: poleSitter.Driver.driverId,
        name: getDriverName(poleSitter.Driver),
      },
    ];
  });

  return buildCircuitRecord(poleSitters);
};

const getCircuitConstructorWinsRecord = (
  races: ErgastRace[]
): CircuitRecord | undefined => {
  const winners = races.flatMap<CircuitRecordEntry>((race) => {
    const winner = getRaceWinner(race);
    if (!winner) return [];

    return [
      {
        id: winner.Constructor.constructorId,
        name: getConstructorName(winner.Constructor),
      },
    ];
  });

  return buildCircuitRecord(winners);
};

const getCircuitConstructorPodiumsRecord = (
  races: ErgastRace[]
): CircuitRecord | undefined => {
  const podiums = races.flatMap<CircuitRecordEntry>((race) =>
    (race.Results ?? [])
      .filter((result) => {
        const position = Number(result.position);
        return position >= 1 && position <= 3;
      })
      .map((result) => ({
        id: result.Constructor.constructorId,
        name: getConstructorName(result.Constructor),
      }))
  );

  return buildCircuitRecord(podiums);
};

const formatCircuitRecord = (
  record: CircuitRecord | undefined,
  isLoading: boolean,
  singularLabel: string,
  pluralLabel = `${singularLabel}s`
): string => {
  if (!record) return isLoading ? "Loading..." : "TBC";

  const label = record.count === 1 ? singularLabel : pluralLabel;
  return `${record.holder} (${record.count} ${label}${record.isTie ? " each" : ""})`;
};

const formatCoordinate = (
  value: string | undefined,
  positiveSuffix: string,
  negativeSuffix: string
): string | undefined => {
  const coordinate = Number.parseFloat(value ?? "");
  if (!Number.isFinite(coordinate)) return undefined;
  const suffix = coordinate >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(coordinate).toFixed(4)}° ${suffix}`;
};

const getCircuitMapUrl = (circuit: ErgastCircuit): string => {
  const { lat, long, locality, country } = circuit.Location;
  const query =
    lat && long
      ? `${lat},${long}`
      : `${circuit.circuitName}, ${locality}, ${country}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

function CircuitProfile(): JSX.Element {
  const { id } = useParams({ from: "/circuit/$id" });
  const { selectedSeason } = useSelectedSeason();
  const [favoriteCircuitIds, setFavoriteCircuitIds] =
    useState<string[]>(readFavoriteCircuits);
  const { data: circuitData, isLoading: isCircuitLoading } =
    useCircuitProfile(id);
  const { data: seasonRacesData, isLoading: areRacesLoading } =
    useCurrentSeasonRaces(selectedSeason);
  const {
    data: circuitWinnersData,
    isLoading: areWinnersLoading,
    isError: hasWinnersError,
  } = useCircuitRaceWinners(id);
  const { data: circuitPoleSittersData, isLoading: arePoleSittersLoading } =
    useCircuitPoleSitters(id);
  const {
    data: circuitPodiumFinishersData,
    isLoading: arePodiumFinishersLoading,
  } = useCircuitPodiumFinishers(id);

  const seasonRaces = useMemo<ErgastRace[]>(
    () => sortByRound(seasonRacesData ?? []),
    [seasonRacesData]
  );
  const circuitRaces = useMemo<ErgastRace[]>(
    () => seasonRaces.filter((race) => race.Circuit.circuitId === id),
    [id, seasonRaces]
  );
  const previousWinners = useMemo<ErgastRace[]>(
    () =>
      sortByMostRecent((circuitWinnersData ?? []).filter(getRaceWinner)).slice(
        0,
        PREVIOUS_WINNERS_LIMIT
      ),
    [circuitWinnersData]
  );
  const seasonCircuit = circuitRaces[0]?.Circuit;
  const circuit = circuitData ?? seasonCircuit;
  const location = circuit?.Location;
  const latitude = formatCoordinate(location?.lat, "N", "S");
  const longitude = formatCoordinate(location?.long, "E", "W");
  const lapRecordHolder = getCircuitLapRecordHolder(circuit?.circuitId);
  const winsRecord = useMemo(
    () => getCircuitWinsRecord(circuitWinnersData ?? []),
    [circuitWinnersData]
  );
  const polePositionsRecord = useMemo(
    () => getCircuitPolePositionsRecord(circuitPoleSittersData ?? []),
    [circuitPoleSittersData]
  );
  const constructorWinsRecord = useMemo(
    () => getCircuitConstructorWinsRecord(circuitWinnersData ?? []),
    [circuitWinnersData]
  );
  const constructorPodiumsRecord = useMemo(
    () => getCircuitConstructorPodiumsRecord(circuitPodiumFinishersData ?? []),
    [circuitPodiumFinishersData]
  );
  const completedRaces = circuitRaces.filter(
    (race) => getRaceDate(race).getTime() < INITIAL_PROFILE_RENDER_TIME
  ).length;

  useEffect(() => {
    document.title = circuit
      ? `${circuit.circuitName} Circuit Profile`
      : "Circuit Profile";
  }, [circuit]);

  if ((isCircuitLoading || areRacesLoading) && !circuit) {
    return <Loader />;
  }

  if (!circuit) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <EmptyState
          title="Circuit profile unavailable"
          message={`We could not find detailed track information for ${id}. Try another circuit from the ${selectedSeason} calendar.`}
        />
      </div>
    );
  }

  const isFavoriteCircuit = favoriteCircuitIds.includes(circuit.circuitId);
  const favoriteButtonLabel = isFavoriteCircuit
    ? `Remove ${circuit.circuitName} from favorite circuits`
    : `Mark ${circuit.circuitName} as favorite`;
  const handleFavoriteToggle = (): void => {
    setFavoriteCircuitIds((currentFavoriteCircuitIds) => {
      const nextFavoriteCircuitIds = currentFavoriteCircuitIds.includes(
        circuit.circuitId
      )
        ? currentFavoriteCircuitIds.filter(
            (favoriteCircuitId) => favoriteCircuitId !== circuit.circuitId
          )
        : [...currentFavoriteCircuitIds, circuit.circuitId];

      return saveFavoriteCircuits(nextFavoriteCircuitIds);
    });
  };

  return (
    <main className="bg-(--background-color) px-4 py-8 text-(--text-color) sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-(--background-color2) bg-[linear-gradient(135deg,var(--background-buttons),var(--background-color))] shadow-xl shadow-black/10">
        <div className="grid gap-8 p-6 md:grid-cols-[1.5fr_1fr] md:p-10">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-(--color3)">
              Circuit profile · {selectedSeason}
            </p>
            <h1 className="font-['F1_Bold'] text-3xl leading-tight sm:text-5xl">
              {circuit.circuitName}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-3 text-lg text-(--text-color2)">
              <Flag
                code={countryCode(location.country)}
                className="h-5 w-8 overflow-hidden rounded-sm"
              />
              <span>
                {location.locality}, {location.country}
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                aria-pressed={isFavoriteCircuit}
                aria-label={favoriteButtonLabel}
                className={`rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color3) ${
                  isFavoriteCircuit
                    ? "border-(--color3) bg-(--color3) text-white"
                    : "border-(--background-color2) bg-(--background-color) text-(--text-color2) hover:border-(--color3) hover:text-(--color3)"
                }`}
                onClick={handleFavoriteToggle}
              >
                <span
                  aria-hidden="true"
                  className="mr-2 text-base leading-none"
                >
                  {isFavoriteCircuit ? "★" : "☆"}
                </span>
                {isFavoriteCircuit ? "Favorited" : "Favorite"}
              </button>
              <a
                href={getCircuitMapUrl(circuit)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-(--color3) px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-(--color1) transition-colors hover:bg-(--color3) hover:text-(--background-color)"
              >
                Open map
              </a>
              {circuit.url && (
                <a
                  href={circuit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-(--background-color2) px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-(--text-color) transition-colors hover:border-(--color2) hover:text-(--color2)"
                >
                  Reference
                </a>
              )}
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Season rounds
              </dt>
              <dd className="mt-2 font-['F1_Bold'] text-2xl">
                {circuitRaces.length}
              </dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Completed
              </dt>
              <dd className="mt-2 font-['F1_Bold'] text-2xl">
                {completedRaces}
              </dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Lap record holder
              </dt>
              <dd className="mt-2 font-semibold">{lapRecordHolder ?? "TBC"}</dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                All-time wins leader
              </dt>
              <dd className="mt-2 font-semibold">
                {formatCircuitRecord(winsRecord, areWinnersLoading, "win")}
              </dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                All-time pole-position leader
              </dt>
              <dd className="mt-2 font-semibold">
                {formatCircuitRecord(
                  polePositionsRecord,
                  arePoleSittersLoading,
                  "pole"
                )}
              </dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Constructor wins leader
              </dt>
              <dd className="mt-2 font-semibold">
                {formatCircuitRecord(
                  constructorWinsRecord,
                  areWinnersLoading,
                  "win"
                )}
              </dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Constructor podium leader
              </dt>
              <dd className="mt-2 font-semibold">
                {formatCircuitRecord(
                  constructorPodiumsRecord,
                  arePodiumFinishersLoading,
                  "podium"
                )}
              </dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Latitude
              </dt>
              <dd className="mt-2 font-semibold">{latitude ?? "TBC"}</dd>
            </div>
            <div className="rounded-2xl bg-(--background-color) p-5 ring-1 ring-(--background-color2)">
              <dt className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                Longitude
              </dt>
              <dd className="mt-2 font-semibold">{longitude ?? "TBC"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <CircuitMap
        circuitId={circuit.circuitId}
        circuitName={circuit.circuitName}
        locality={location.locality}
        country={location.country}
        mapUrl={getCircuitMapUrl(circuit)}
        latitude={latitude}
        longitude={longitude}
      />

      <section
        className="mx-auto mt-8 max-w-7xl rounded-3xl border border-(--background-color2) bg-(--background-buttons) p-6 md:p-8"
        aria-labelledby="circuit-previous-winners"
      >
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.22em] text-(--color3)">
            Historical context
          </p>
          <h2
            id="circuit-previous-winners"
            className="font-['F1_Bold'] text-2xl"
          >
            Previous winners
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-color2)">
            A recent roll call of drivers who have stood on the top step at{" "}
            {circuit.circuitName}.
          </p>
        </div>

        {areWinnersLoading ? (
          <p className="rounded-2xl border border-(--background-color2) bg-(--background-color) p-5 text-sm text-(--text-color2)">
            Loading previous winners...
          </p>
        ) : hasWinnersError ? (
          <EmptyState
            title="Previous winners unavailable"
            message="Historical winner data could not be loaded right now."
          />
        ) : previousWinners.length === 0 ? (
          <EmptyState
            title="No previous winners found"
            message={`We could not find race-winning results for ${circuit.circuitName}.`}
          />
        ) : (
          <ol
            className="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-4"
            aria-label={`Previous winners at ${circuit.circuitName}`}
          >
            {previousWinners.map((race) => {
              const winner = getRaceWinner(race);
              if (!winner) return null;
              const driverName = getDriverName(winner.Driver);

              return (
                <li
                  key={`${race.season}-${race.round}`}
                  className="rounded-2xl border border-(--background-color2) bg-(--background-color) p-5 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-(--color3)">
                    {race.season} winner
                  </p>
                  <h3 className="mt-2 font-['F1_Bold'] text-xl">
                    {driverName}
                  </h3>
                  <p className="mt-2 text-sm text-(--text-color2)">
                    {winner.Constructor?.name ?? "Constructor TBC"}
                  </p>
                  <p className="mt-1 text-sm text-(--text-color2)">
                    {race.raceName}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to="/driver/$id"
                      params={{ id: winner.Driver.driverId }}
                      search={seasonSearchParams(race.season)}
                      className="rounded-full border border-(--background-color2) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-color) transition-colors hover:border-(--color2) hover:text-(--color2)"
                    >
                      Driver profile
                    </Link>
                    <Link
                      to="/race/$race"
                      params={{ race: race.round }}
                      search={seasonSearchParams(race.season)}
                      className="rounded-full border border-(--color3) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color1) transition-colors hover:bg-(--color3) hover:text-(--background-color)"
                    >
                      Race result
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section
        className="mx-auto mt-8 max-w-7xl rounded-3xl border border-(--background-color2) bg-(--background-buttons) p-6 md:p-8"
        aria-labelledby="circuit-season-races"
      >
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-(--color3)">
              Track calendar
            </p>
            <h2 id="circuit-season-races" className="font-['F1_Bold'] text-2xl">
              {selectedSeason} races at this circuit
            </h2>
          </div>
          <Link
            to="/schedule"
            search={seasonSearchParams(selectedSeason)}
            className="text-sm font-semibold text-(--color1) hover:text-(--color3)"
          >
            Back to calendar
          </Link>
        </div>

        {circuitRaces.length === 0 ? (
          <EmptyState
            title="No selected-season race"
            message={`${circuit.circuitName} is not listed on the ${selectedSeason} calendar.`}
          />
        ) : (
          <ol
            className="grid list-none gap-4 p-0 md:grid-cols-2"
            aria-label={`${selectedSeason} races at ${circuit.circuitName}`}
          >
            {circuitRaces.map((race) => (
              <li
                key={race.round}
                className="rounded-2xl border border-(--background-color2) bg-(--background-color) p-5 shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
                  Round {race.round}
                </p>
                <h3 className="mt-2 font-['F1_Bold'] text-xl">
                  {race.raceName}
                </h3>
                <p className="mt-2 text-sm text-(--text-color2)">
                  {formatRaceDate(race)}
                </p>
                <Link
                  to="/race/$race"
                  params={{ race: race.round }}
                  search={seasonSearchParams(selectedSeason)}
                  className="mt-4 inline-flex rounded-full border border-(--color3) px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color1) transition-colors hover:bg-(--color3) hover:text-(--background-color)"
                >
                  View race details
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

export default CircuitProfile;
