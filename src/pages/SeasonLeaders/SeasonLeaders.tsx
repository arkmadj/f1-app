import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import EmptyState from "../../components/EmptyState/EmptyState";
import Loader from "../../components/Loader/Loader";
import { seasonSearchParams } from "../../domain/f1/seasons";
import {
  useAllQualifyingResults,
  useAllRaceResults,
  useAllSprintResults,
  useConstructorStandings,
  useDriverStandings,
} from "../../hooks/queries";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import type {
  ConstructorStanding,
  DriverStanding,
} from "../../services/api/constructorsApi";
import type {
  QualifyingRaceWithResults,
  QualifyingResult,
  RaceResult,
  RaceWithResults,
  SprintRaceWithResults,
} from "../../services/api/racesApi";

interface LeaderSummary {
  id: string;
  name: string;
  count: number;
  tieBreaker: number;
}

interface LeaderCard {
  key: string;
  label: string;
  value: string;
  leader: LeaderSummary;
  kind: "driver" | "constructor";
}

const sectionClassName =
  "rounded-3xl border border-black/5 bg-(--background-buttons) p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]";
const cardClassName =
  "rounded-2xl bg-(--background-color) p-4 ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-0.5";

const parseNumber = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const driverName = (
  driver: Pick<RaceResult["Driver"], "givenName" | "familyName">
): string => `${driver.givenName} ${driver.familyName}`.trim();

const pickLeader = (counts: Map<string, LeaderSummary>): LeaderSummary | null =>
  [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.tieBreaker - right.tieBreaker ||
      left.name.localeCompare(right.name)
  )[0] ?? null;

const incrementLeader = (
  counts: Map<string, LeaderSummary>,
  id: string | undefined,
  name: string | undefined,
  round: string | undefined
): void => {
  if (!id || !name) {
    return;
  }

  const current = counts.get(id);
  counts.set(id, {
    id,
    name,
    count: (current?.count ?? 0) + 1,
    tieBreaker: current?.tieBreaker ?? Math.max(parseNumber(round), 1),
  });
};

const isDnfResult = (result: RaceResult): boolean => {
  const status = result.status?.trim().toLowerCase();

  if (!status || status === "finished" || status === "disqualified") {
    return false;
  }

  if (/^\+[0-9]+ laps?$/.test(status)) {
    return false;
  }

  return !result.Time;
};

const getPoleSitter = (results: readonly QualifyingResult[]): QualifyingResult | null =>
  results.find((result) => result.position === "1") ?? results[0] ?? null;

const getDriverWinsLeader = (drivers: readonly DriverStanding[]): LeaderSummary | null =>
  drivers
    .map((driver) => ({
      id: driver.Driver.driverId,
      name: driverName(driver.Driver),
      count: parseNumber(driver.wins),
      tieBreaker: Math.max(parseNumber(driver.position), 1),
    }))
    .filter((driver) => driver.count > 0)
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.tieBreaker - right.tieBreaker ||
        left.name.localeCompare(right.name)
    )[0] ?? null;

const getConstructorWinsLeader = (
  teams: readonly ConstructorStanding[]
): LeaderSummary | null =>
  teams
    .map((team) => ({
      id: team.Constructor.constructorId,
      name: team.Constructor.name,
      count: parseNumber(team.wins),
      tieBreaker: Math.max(parseNumber(team.position), 1),
    }))
    .filter((team) => team.count > 0)
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.tieBreaker - right.tieBreaker ||
        left.name.localeCompare(right.name)
    )[0] ?? null;

const collectRaceLeaders = (
  races: readonly RaceWithResults[],
  predicate: (result: RaceResult) => boolean,
  kind: "driver" | "constructor"
): LeaderSummary | null => {
  const counts = new Map<string, LeaderSummary>();

  races.forEach((race) => {
    race.results.forEach((result) => {
      if (!predicate(result)) {
        return;
      }

      if (kind === "driver") {
        incrementLeader(
          counts,
          result.Driver.driverId,
          driverName(result.Driver),
          race.round
        );
        return;
      }

      incrementLeader(
        counts,
        result.Constructor.constructorId,
        result.Constructor.name,
        race.round
      );
    });
  });

  return pickLeader(counts);
};

const getDriverPoleLeader = (
  qualifyingRaces: readonly QualifyingRaceWithResults[]
): LeaderSummary | null => {
  const counts = new Map<string, LeaderSummary>();

  qualifyingRaces.forEach((race) => {
    const poleSitter = getPoleSitter(race.results);
    incrementLeader(
      counts,
      poleSitter?.Driver.driverId,
      poleSitter ? driverName(poleSitter.Driver) : undefined,
      race.round
    );
  });

  return pickLeader(counts);
};

const getConstructorPoleLeader = (
  qualifyingRaces: readonly QualifyingRaceWithResults[]
): LeaderSummary | null => {
  const counts = new Map<string, LeaderSummary>();

  qualifyingRaces.forEach((race) => {
    const poleSitter = getPoleSitter(race.results);
    incrementLeader(
      counts,
      poleSitter?.Constructor.constructorId,
      poleSitter?.Constructor.name,
      race.round
    );
  });

  return pickLeader(counts);
};

const getDriverSprintWinsLeader = (
  sprintRaces: readonly SprintRaceWithResults[]
): LeaderSummary | null => {
  const counts = new Map<string, LeaderSummary>();

  sprintRaces.forEach((race) => {
    const sprintWinner = race.results.find(
      (result) => parseNumber(result.position) === 1
    );
    incrementLeader(
      counts,
      sprintWinner?.Driver.driverId,
      sprintWinner ? driverName(sprintWinner.Driver) : undefined,
      race.round
    );
  });

  return pickLeader(counts);
};

const getConstructorPenaltyLeader = (
  races: readonly RaceWithResults[],
  qualifyings: readonly QualifyingRaceWithResults[]
): LeaderSummary | null => {
  const qualifyingPositions = new Map<string, number>();
  const counts = new Map<string, LeaderSummary>();

  qualifyings.forEach((qualifying) => {
    qualifying.results.forEach((result) => {
      const qualifyingPosition = parseNumber(result.position);

      if (!result.Driver.driverId || qualifyingPosition <= 0) {
        return;
      }

      qualifyingPositions.set(
        `${qualifying.round}:${result.Driver.driverId}`,
        qualifyingPosition
      );
    });
  });

  races.forEach((race) => {
    race.results.forEach((result) => {
      const qualifyingPosition = qualifyingPositions.get(
        `${race.round}:${result.Driver.driverId}`
      );
      const gridPosition = parseNumber(result.grid);
      const startedFromPitLane = result.grid?.trim() === "0";
      const hasPenalty =
        startedFromPitLane ||
        (qualifyingPosition !== undefined && gridPosition > qualifyingPosition);

      if (!hasPenalty) {
        return;
      }

      incrementLeader(
        counts,
        result.Constructor.constructorId,
        result.Constructor.name,
        race.round
      );
    });
  });

  return pickLeader(counts);
};

function SeasonLeaders(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const driverQuery = useDriverStandings(selectedSeason);
  const constructorQuery = useConstructorStandings(selectedSeason);
  const raceQuery = useAllRaceResults(selectedSeason);
  const qualifyingQuery = useAllQualifyingResults(selectedSeason);
  const sprintQuery = useAllSprintResults(selectedSeason);

  useEffect(() => {
    document.title = t("seasonLeaders.metaTitle");
  }, [i18n.resolvedLanguage, t]);

  const errors = useMemo(
    () =>
      [
        driverQuery.error,
        constructorQuery.error,
        raceQuery.error,
        qualifyingQuery.error,
        sprintQuery.error,
      ].filter((error): error is Error => Boolean(error)),
    [
      constructorQuery.error,
      driverQuery.error,
      qualifyingQuery.error,
      raceQuery.error,
      sprintQuery.error,
    ]
  );

  useEffect(() => {
    errors.forEach((error) => {
      console.error("Error fetching season leaders:", error);
    });
  }, [errors]);

  const drivers = driverQuery.data ?? [];
  const constructors = constructorQuery.data ?? [];
  const races = raceQuery.data ?? [];
  const qualifyings = qualifyingQuery.data ?? [];
  const sprints = sprintQuery.data ?? [];

  const driverCards = useMemo<LeaderCard[]>(() => {
    const leaders = [
      {
        key: "wins",
        label: t("seasonLeaders.labels.mostWins"),
        valueKey: "wins",
        leader: getDriverWinsLeader(drivers),
      },
      {
        key: "podiums",
        label: t("seasonLeaders.labels.mostPodiums"),
        valueKey: "podiums",
        leader: collectRaceLeaders(
          races,
          (result) => {
            const position = parseNumber(result.position);
            return position >= 1 && position <= 3;
          },
          "driver"
        ),
      },
      {
        key: "sprintWins",
        label: t("seasonLeaders.labels.mostSprintWins"),
        valueKey: "sprintWins",
        leader: getDriverSprintWinsLeader(sprints),
      },
      {
        key: "poles",
        label: t("seasonLeaders.labels.mostPoles"),
        valueKey: "poles",
        leader: getDriverPoleLeader(qualifyings),
      },
      {
        key: "fastestLaps",
        label: t("seasonLeaders.labels.mostFastestLaps"),
        valueKey: "fastestLaps",
        leader: collectRaceLeaders(
          races,
          (result) => parseNumber(result.FastestLap?.rank) === 1,
          "driver"
        ),
      },
      {
        key: "dnfs",
        label: t("seasonLeaders.labels.mostDnfs"),
        valueKey: "dnfs",
        leader: collectRaceLeaders(races, isDnfResult, "driver"),
      },
    ];

    return leaders.flatMap((item) =>
      item.leader
        ? [
            {
              key: item.key,
              label: item.label,
              value: t(`seasonLeaders.values.${item.valueKey}`, {
                count: item.leader.count,
              }),
              leader: item.leader,
              kind: "driver" as const,
            },
          ]
        : []
    );
  }, [drivers, qualifyings, races, sprints, t]);

  const constructorCards = useMemo<LeaderCard[]>(() => {
    const leaders = [
      {
        key: "wins",
        label: t("seasonLeaders.labels.mostWins"),
        valueKey: "wins",
        leader: getConstructorWinsLeader(constructors),
      },
      {
        key: "podiums",
        label: t("seasonLeaders.labels.mostPodiums"),
        valueKey: "podiums",
        leader: collectRaceLeaders(
          races,
          (result) => {
            const position = parseNumber(result.position);
            return position >= 1 && position <= 3;
          },
          "constructor"
        ),
      },
      {
        key: "poles",
        label: t("seasonLeaders.labels.mostPoles"),
        valueKey: "poles",
        leader: getConstructorPoleLeader(qualifyings),
      },
      {
        key: "fastestLaps",
        label: t("seasonLeaders.labels.mostFastestLaps"),
        valueKey: "fastestLaps",
        leader: collectRaceLeaders(
          races,
          (result) => parseNumber(result.FastestLap?.rank) === 1,
          "constructor"
        ),
      },
      {
        key: "dnfs",
        label: t("seasonLeaders.labels.mostDnfs"),
        valueKey: "dnfs",
        leader: collectRaceLeaders(races, isDnfResult, "constructor"),
      },
      {
        key: "penalties",
        label: t("seasonLeaders.labels.mostPenalties"),
        valueKey: "penalties",
        leader: getConstructorPenaltyLeader(races, qualifyings),
      },
    ];

    return leaders.flatMap((item) =>
      item.leader
        ? [
            {
              key: item.key,
              label: item.label,
              value: t(`seasonLeaders.values.${item.valueKey}`, {
                count: item.leader.count,
              }),
              leader: item.leader,
              kind: "constructor" as const,
            },
          ]
        : []
    );
  }, [constructors, qualifyings, races, t]);

  if (
    driverQuery.isLoading ||
    constructorQuery.isLoading ||
    raceQuery.isLoading ||
    qualifyingQuery.isLoading ||
    sprintQuery.isLoading
  ) {
    return <Loader label={t("seasonLeaders.loading")} />;
  }

  if (driverCards.length === 0 && constructorCards.length === 0) {
    return (
      <main className="mx-auto w-[min(100%-2rem,80rem)] mt-10">
        <EmptyState
          title={t("seasonLeaders.empty.title")}
          message={t("seasonLeaders.empty.message", { season: selectedSeason })}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-[min(100%-2rem,80rem)] py-8 font-(--f1r)">
      <header className={sectionClassName}>
        <p className="text-left text-xs uppercase tracking-[0.22em] text-(--text-color3)">
          {t("nav.items.seasonLeaders")}
        </p>
        <h1 className="mt-3 font-['F1_Bold'] text-2xl text-(--text-color) md:text-3xl">
          {t("seasonLeaders.heading", { season: selectedSeason })}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-color3)">
          {t("seasonLeaders.description")}
        </p>
      </header>

      <section className={`${sectionClassName} mt-5`}>
        <p className="text-left text-xs uppercase tracking-[0.22em] text-(--text-color3)">
          {t("seasonLeaders.sections.driversEyebrow")}
        </p>
        <h2 className="mt-3 font-['F1_Bold'] text-xl text-(--text-color)">
          {t("seasonLeaders.sections.driversHeading")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-color3)">
          {t("seasonLeaders.sections.driversDescription")}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {driverCards.map((card) => (
            <article key={card.key} className={cardClassName}>
              <p className="text-xs uppercase tracking-[0.18em] text-(--text-color3)">
                {card.label}
              </p>
              <Link
                to="/driver/$id"
                params={{ id: card.leader.id }}
                search={seasonSearchParams(selectedSeason)}
                className="mt-3 block font-['F1_Bold'] text-2xl text-(--text-color) no-underline transition-colors hover:text-(--color3)"
              >
                {card.leader.name}
              </Link>
              <p className="mt-2 text-sm text-(--text-color3)">{card.value}</p>
              <Link
                to="/driver/$id"
                params={{ id: card.leader.id }}
                search={seasonSearchParams(selectedSeason)}
                className="mt-4 inline-flex items-center rounded-full border border-(--color3) px-3 py-1.5 text-sm font-['F1_Bold'] text-(--color3) no-underline transition-colors hover:bg-(--color3) hover:text-white"
              >
                {t("seasonLeaders.links.viewDriver")}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={`${sectionClassName} mt-5`}>
        <p className="text-left text-xs uppercase tracking-[0.22em] text-(--text-color3)">
          {t("seasonLeaders.sections.constructorsEyebrow")}
        </p>
        <h2 className="mt-3 font-['F1_Bold'] text-xl text-(--text-color)">
          {t("seasonLeaders.sections.constructorsHeading")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-color3)">
          {t("seasonLeaders.sections.constructorsDescription")}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {constructorCards.map((card) => (
            <article key={card.key} className={cardClassName}>
              <p className="text-xs uppercase tracking-[0.18em] text-(--text-color3)">
                {card.label}
              </p>
              <Link
                to="/constructor/$id"
                params={{ id: card.leader.id }}
                search={seasonSearchParams(selectedSeason)}
                className="mt-3 block font-['F1_Bold'] text-2xl text-(--text-color) no-underline transition-colors hover:text-(--color3)"
              >
                {card.leader.name}
              </Link>
              <p className="mt-2 text-sm text-(--text-color3)">{card.value}</p>
              <Link
                to="/constructor/$id"
                params={{ id: card.leader.id }}
                search={seasonSearchParams(selectedSeason)}
                className="mt-4 inline-flex items-center rounded-full border border-(--color3) px-3 py-1.5 text-sm font-['F1_Bold'] text-(--color3) no-underline transition-colors hover:bg-(--color3) hover:text-white"
              >
                {t("seasonLeaders.links.viewConstructor")}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default SeasonLeaders;