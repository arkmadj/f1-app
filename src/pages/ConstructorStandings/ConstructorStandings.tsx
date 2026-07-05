import { useEffect, useMemo } from "react";
import Flag from "react-world-flags";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Loader from "../../components/Loader/Loader";
import EmptyState from "../../components/EmptyState/EmptyState";
import { nationalityCountryCode } from "../../domain/f1/images";
import teamColorClass from "../../domain/f1/teamColorClass";
import { getTeamLogo } from "../../domain/f1/teamLogo";
import { Link } from "@tanstack/react-router";
import {
  useAllQualifyingResults,
  useAllRaceResults,
  useConstructorStandings,
  useConstructorStandingsTimeline,
} from "../../hooks/queries";
import type {
  ConstructorStanding,
  ConstructorStandingsTimelineRound,
} from "../../services/api/constructorsApi";
import type {
  QualifyingRaceWithResults,
  QualifyingResult,
  RaceResult,
  RaceWithResults,
} from "../../services/api/racesApi";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";

// ---------------------------------------------------------------------------
// `teamColorClass` only covers a subset of teams, so every lookup is treated
// as potentially `undefined`. `nationalityCountryCode` is already strictly
// typed and returns `""` for unknown nationalities.
// ---------------------------------------------------------------------------

const colorClasses = teamColorClass as Record<string, string | undefined>;
const spotlightCardClass =
  "rounded-2xl bg-(--background-color) px-4 py-4 text-left ring-1 ring-black/5";

interface ConstructorStandingWithGap {
  standing: ConstructorStanding;
  gapToLeader: number;
  gapToAhead: number | null;
  positionChange: number | null;
}

const constructorInitials = (teamName: string): string =>
  teamName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

const parseWins = (wins?: string): number =>
  Number.parseInt(wins ?? "0", 10) || 0;

const escapeCsvValue = (value: string): string => {
  const normalizedValue = value.replace(/\r?\n/g, " ");
  if (!/[",\r\n]/.test(normalizedValue)) return normalizedValue;

  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const parsePoints = (points?: string): number => {
  const parsed = Number.parseFloat(points ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatGap = (gap: number | null, language: string): string => {
  if (gap === null) {
    return "—";
  }

  if (gap === 0) {
    return "0";
  }

  return `+${gap.toLocaleString(language)}`;
};

const sortByRound = <T extends { round: string }>(items: readonly T[]): T[] =>
  [...items].sort((left, right) => {
    const leftRound = parsePosition(left.round) ?? 0;
    const rightRound = parsePosition(right.round) ?? 0;
    return leftRound - rightRound;
  });

const getConstructorPositionChanges = (
  currentConstructors: readonly ConstructorStanding[],
  timeline: readonly ConstructorStandingsTimelineRound[]
): Map<string, number> => {
  const positionChanges = new Map<string, number>();
  const sortedTimeline = sortByRound(timeline);
  const previousRound =
    sortedTimeline.length > 1 ? sortedTimeline[sortedTimeline.length - 2] : null;

  if (!previousRound) {
    return positionChanges;
  }

  const previousPositions = new Map<string, number>();
  previousRound.ConstructorStandings.forEach((standing, index) => {
    previousPositions.set(
      standing.Constructor.constructorId,
      parsePosition(standing.position) ?? index + 1
    );
  });

  currentConstructors.forEach((standing, index) => {
    const previousPosition = previousPositions.get(standing.Constructor.constructorId);

    if (previousPosition === undefined) {
      return;
    }

    const currentPosition = parsePosition(standing.position) ?? index + 1;
    positionChanges.set(
      standing.Constructor.constructorId,
      previousPosition - currentPosition
    );
  });

  return positionChanges;
};

const getPositionChangePresentation = (
  positionChange: number | null,
  t: TFunction
): { label: string; text: string; className: string } | null => {
  if (positionChange === null) {
    return null;
  }

  if (positionChange > 0) {
    return {
      label: t("constructorStandings.positionChange.gained", {
        count: positionChange,
      }),
      text: `▲${positionChange}`,
      className:
        "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20",
    };
  }

  if (positionChange < 0) {
    return {
      label: t("constructorStandings.positionChange.lost", {
        count: Math.abs(positionChange),
      }),
      text: `▼${Math.abs(positionChange)}`,
      className: "bg-red-500/12 text-red-700 ring-1 ring-red-500/20",
    };
  }

  return {
    label: t("constructorStandings.positionChange.unchanged"),
    text: "—",
    className: "bg-(--background-color) text-(--text-color3) ring-1 ring-black/10",
  };
};

const formatPositionChangeForCsv = (
  positionChange: number | null,
  t: TFunction
): string => getPositionChangePresentation(positionChange, t)?.label ?? "—";

const buildConstructorStandingsCsv = (
  teamsWithGaps: readonly ConstructorStandingWithGap[],
  language: string,
  t: TFunction
): string => {
  const headers = [
    t("constructorStandings.columns.position"),
    t("constructorStandings.columns.team"),
    t("constructorStandings.columns.positionChange"),
    t("constructorStandings.columns.gapToLeader"),
    t("constructorStandings.columns.gapToAhead"),
    t("constructorStandings.columns.points"),
    t("constructorStandings.columns.wins"),
  ];

  const rows = teamsWithGaps.map(
    ({ standing, gapToLeader, gapToAhead, positionChange }) => [
      standing.position,
      standing.Constructor.name,
      formatPositionChangeForCsv(positionChange, t),
      formatGap(gapToLeader, language),
      formatGap(gapToAhead, language),
      standing.points || "0",
      standing.wins || "0",
    ]
  );

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

const getConstructorStandingsExportFilename = (season: string): string =>
  `${season}-constructor-standings.csv`;

const parsePosition = (value?: string): number | null => {
  const position = Number.parseInt(value ?? "", 10);
  return Number.isFinite(position) && position > 0 ? position : null;
};

const isDnfResult = (result: RaceResult): boolean => {
  const status = result.status?.trim().toLowerCase();

  if (!status) {
    return false;
  }

  if (status === "finished" || status === "disqualified") {
    return false;
  }

  if (/^\+[0-9]+ laps?$/.test(status)) {
    return false;
  }

  return !result.Time;
};

const getPoleSitter = (
  results: readonly QualifyingResult[]
): QualifyingResult | null =>
  results.find((result) => result.position === "1") ?? results[0] ?? null;

const getTopPoleConstructor = (
  teams: readonly ConstructorStanding[],
  qualifyings: readonly QualifyingRaceWithResults[]
): { team: ConstructorStanding; poles: number } | null => {
  const poleCounts = new Map<string, number>();

  qualifyings.forEach((quali) => {
    const poleSitter = getPoleSitter(quali.results);
    const constructorId = poleSitter?.Constructor.constructorId;

    if (!constructorId) {
      return;
    }

    poleCounts.set(constructorId, (poleCounts.get(constructorId) ?? 0) + 1);
  });

  return teams.reduce<{ team: ConstructorStanding; poles: number } | null>(
    (leader, team) => {
      const poles = poleCounts.get(team.Constructor.constructorId) ?? 0;

      if (poles === 0) {
        return leader;
      }

      if (!leader || poles > leader.poles) {
        return { team, poles };
      }

      return leader;
    },
    null
  );
};

const getPodiumFinishers = (results: readonly RaceResult[]): RaceResult[] =>
  results.filter((result) => {
    const position = parsePosition(result.position);
    return position !== null && position >= 1 && position <= 3;
  });

const getTopPenaltyConstructor = (
  teams: readonly ConstructorStanding[],
  races: readonly RaceWithResults[],
  qualifyings: readonly QualifyingRaceWithResults[]
): { team: ConstructorStanding; penalties: number } | null => {
  const qualifyingPositions = new Map<string, number>();
  const penaltyCounts = new Map<string, number>();

  qualifyings.forEach((qualifying) => {
    qualifying.results.forEach((result) => {
      const qualifyingPosition = parsePosition(result.position);
      const driverId = result.Driver.driverId;

      if (!driverId || qualifyingPosition === null) {
        return;
      }

      qualifyingPositions.set(
        `${qualifying.round}:${driverId}`,
        qualifyingPosition
      );
    });
  });

  races.forEach((race) => {
    race.results.forEach((result) => {
      const driverId = result.Driver.driverId;
      const constructorId = result.Constructor.constructorId;

      if (!driverId || !constructorId) {
        return;
      }

      const qualifyingPosition = qualifyingPositions.get(
        `${race.round}:${driverId}`
      );
      const startedFromPitLane = result.grid?.trim() === "0";
      const gridPosition = parsePosition(result.grid);
      const hasPenalty =
        startedFromPitLane ||
        (qualifyingPosition !== undefined &&
          gridPosition !== null &&
          gridPosition > qualifyingPosition);

      if (!hasPenalty) {
        return;
      }

      penaltyCounts.set(
        constructorId,
        (penaltyCounts.get(constructorId) ?? 0) + 1
      );
    });
  });

  return teams.reduce<{ team: ConstructorStanding; penalties: number } | null>(
    (leader, team) => {
      const penalties = penaltyCounts.get(team.Constructor.constructorId) ?? 0;

      if (penalties === 0) {
        return leader;
      }

      if (!leader || penalties > leader.penalties) {
        return { team, penalties };
      }

      return leader;
    },
    null
  );
};

const getTopPodiumConstructor = (
  teams: readonly ConstructorStanding[],
  races: readonly RaceWithResults[]
): { team: ConstructorStanding; podiums: number } | null => {
  const podiumCounts = new Map<string, number>();

  races.forEach((race) => {
    getPodiumFinishers(race.results).forEach((result) => {
      const constructorId = result.Constructor.constructorId;
      podiumCounts.set(
        constructorId,
        (podiumCounts.get(constructorId) ?? 0) + 1
      );
    });
  });

  return teams.reduce<{ team: ConstructorStanding; podiums: number } | null>(
    (leader, team) => {
      const podiums = podiumCounts.get(team.Constructor.constructorId) ?? 0;

      if (podiums === 0) {
        return leader;
      }

      if (!leader || podiums > leader.podiums) {
        return { team, podiums };
      }

      return leader;
    },
    null
  );
};

const getTopDnfConstructor = (
  teams: readonly ConstructorStanding[],
  races: readonly RaceWithResults[]
): { team: ConstructorStanding; dnfs: number } | null => {
  const dnfCounts = new Map<string, number>();

  races.forEach((race) => {
    race.results.forEach((result) => {
      if (!isDnfResult(result)) {
        return;
      }

      const constructorId = result.Constructor.constructorId;
      dnfCounts.set(constructorId, (dnfCounts.get(constructorId) ?? 0) + 1);
    });
  });

  return teams.reduce<{ team: ConstructorStanding; dnfs: number } | null>(
    (leader, team) => {
      const dnfs = dnfCounts.get(team.Constructor.constructorId) ?? 0;

      if (dnfs === 0) {
        return leader;
      }

      if (!leader || dnfs > leader.dnfs) {
        return { team, dnfs };
      }

      return leader;
    },
    null
  );
};

function ConstructorStandings(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { selectedSeason } = useSelectedSeason();
  const { data, isLoading, error } = useConstructorStandings(selectedSeason);
  const timelineQuery = useConstructorStandingsTimeline(selectedSeason, {
    enabled: !isLoading,
  });
  const teams = useMemo<ConstructorStanding[]>(() => data ?? [], [data]);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const { data: raceData, error: raceResultsError } = useAllRaceResults(
    selectedSeason,
    {
      enabled: teams.length > 0,
    }
  );
  const { data: qualifyingData, error: qualifyingError } =
    useAllQualifyingResults(selectedSeason, {
      enabled: teams.length > 0,
    });

  const listRef = useStaggerFadeIn<HTMLDivElement>({
    selector: "a",
    deps: [teams.length],
  });

  useEffect(() => {
    document.title = t("constructorStandings.metaTitle");
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching constructor standings:", error);
    }
  }, [error]);

  useEffect(() => {
    if (qualifyingError) {
      console.error(
        "Error fetching qualifying results for constructor standings:",
        qualifyingError
      );
    }
  }, [qualifyingError]);

  useEffect(() => {
    if (raceResultsError) {
      console.error(
        "Error fetching race results for constructor standings:",
        raceResultsError
      );
    }
  }, [raceResultsError]);

  useEffect(() => {
    if (timelineQuery.error) {
      console.error(
        "Error fetching constructor standings progression:",
        timelineQuery.error
      );
    }
  }, [timelineQuery.error]);

  const constructorCountLabel = t("constructorStandings.summary", {
    count: teams.length,
  });
  const teamsWithGaps = useMemo<ConstructorStandingWithGap[]>(() => {
    if (teams.length === 0) {
      return [];
    }

    const leaderPoints = parsePoints(teams[0]?.points);
    const positionChanges = getConstructorPositionChanges(
      teams,
      timelineQuery.data ?? []
    );

    return teams.map((standing, index) => {
      const standingPoints = parsePoints(standing.points);
      const aheadPoints = index > 0 ? parsePoints(teams[index - 1]?.points) : null;

      return {
        standing,
        gapToLeader: Math.max(0, leaderPoints - standingPoints),
        gapToAhead:
          aheadPoints === null ? null : Math.max(0, aheadPoints - standingPoints),
        positionChange:
          positionChanges.get(standing.Constructor.constructorId) ?? null,
      };
    });
  }, [teams, timelineQuery.data]);
  const topWinningConstructor = useMemo(
    () =>
      teams.length > 0
        ? teams.reduce((leader, team) =>
            parseWins(team.wins) > parseWins(leader.wins) ? team : leader
          )
        : null,
    [teams]
  );
  const topPoleConstructor = useMemo(
    () => getTopPoleConstructor(teams, qualifyingData ?? []),
    [qualifyingData, teams]
  );
  const topPodiumConstructor = useMemo(
    () => getTopPodiumConstructor(teams, raceData ?? []),
    [raceData, teams]
  );
  const topDnfConstructor = useMemo(
    () => getTopDnfConstructor(teams, raceData ?? []),
    [raceData, teams]
  );
  const topPenaltyConstructor = useMemo(
    () => getTopPenaltyConstructor(teams, raceData ?? [], qualifyingData ?? []),
    [qualifyingData, raceData, teams]
  );

  const handleExportStandings = (): void => {
    const csv = buildConstructorStandingsCsv(teamsWithGaps, currentLanguage, t);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getConstructorStandingsExportFilename(selectedSeason);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-[min(100%-2rem,80rem)] py-8">
        <Loader label={t("constructorStandings.loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-[min(100%-2rem,80rem)] py-8">
      <section className="font-(--f1r)">
        <header className="rounded-3xl border border-black/5 bg-(--background-buttons) p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:p-5">
          <p className="text-left text-xs uppercase tracking-[0.22em] text-(--text-color3)">
            {t("constructorStandings.seasonLabel", { season: selectedSeason })}
          </p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h1 className="font-['F1_Bold'] text-2xl text-(--text-color) md:text-3xl">
              {t("constructorStandings.heading")}
            </h1>
            <p className="text-sm text-(--text-color3)">
              {constructorCountLabel}
            </p>
          </div>
        </header>

        {topWinningConstructor ||
        topPoleConstructor ||
        topPodiumConstructor ||
        topDnfConstructor ||
        topPenaltyConstructor ? (
          <section
            aria-labelledby="constructor-season-spotlight-title"
            className="mt-4 rounded-3xl border border-black/5 bg-(--background-buttons) p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:p-5"
          >
            <p className="text-left text-xs uppercase tracking-[0.22em] text-(--text-color3)">
              {t("constructorStandings.spotlight.eyebrow")}
            </p>
            <div className="mt-3 text-left">
              <h2
                id="constructor-season-spotlight-title"
                className="font-['F1_Bold'] text-xl text-(--text-color)"
              >
                {t("constructorStandings.spotlight.heading")}
              </h2>
              <p className="mt-1 text-sm text-(--text-color3)">
                {t("constructorStandings.spotlight.description", {
                  season: selectedSeason,
                })}
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {topWinningConstructor ? (
                <article className={spotlightCardClass}>
                  <h3 className="font-['F1_Bold'] text-lg text-(--text-color)">
                    {t("constructorStandings.spotlight.mostRaceWins")}
                  </h3>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("constructorStandings.spotlight.winsDescription", {
                      team: topWinningConstructor.Constructor.name,
                      season: selectedSeason,
                    })}
                  </p>
                  <p className="mt-4 text-center text-sm text-(--text-color3)">
                    <span className="block font-['F1_Bold'] text-2xl text-(--text-color)">
                      {topWinningConstructor.wins ?? "0"}
                    </span>
                    {t("constructorStandings.spotlight.values.raceWins")}
                  </p>
                </article>
              ) : null}

              {topPoleConstructor ? (
                <article className={spotlightCardClass}>
                  <h3 className="font-['F1_Bold'] text-lg text-(--text-color)">
                    {t("constructorStandings.spotlight.mostPolePositions")}
                  </h3>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("constructorStandings.spotlight.polesDescription", {
                      team: topPoleConstructor.team.Constructor.name,
                      season: selectedSeason,
                    })}
                  </p>
                  <p className="mt-4 text-center text-sm text-(--text-color3)">
                    <span className="block font-['F1_Bold'] text-2xl text-(--text-color)">
                      {topPoleConstructor.poles}
                    </span>
                    {t("constructorStandings.spotlight.values.polePositions")}
                  </p>
                </article>
              ) : null}

              {topPodiumConstructor ? (
                <article className={spotlightCardClass}>
                  <h3 className="font-['F1_Bold'] text-lg text-(--text-color)">
                    {t("constructorStandings.spotlight.mostPodiumFinishes")}
                  </h3>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("constructorStandings.spotlight.podiumsDescription", {
                      team: topPodiumConstructor.team.Constructor.name,
                      season: selectedSeason,
                    })}
                  </p>
                  <p className="mt-4 text-center text-sm text-(--text-color3)">
                    <span className="block font-['F1_Bold'] text-2xl text-(--text-color)">
                      {topPodiumConstructor.podiums}
                    </span>
                    {t("constructorStandings.spotlight.values.podiumFinishes")}
                  </p>
                </article>
              ) : null}

              {topDnfConstructor ? (
                <article className={spotlightCardClass}>
                  <h3 className="font-['F1_Bold'] text-lg text-(--text-color)">
                    {t("constructorStandings.spotlight.mostDnfs")}
                  </h3>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("constructorStandings.spotlight.dnfsDescription", {
                      team: topDnfConstructor.team.Constructor.name,
                      season: selectedSeason,
                    })}
                  </p>
                  <p className="mt-4 text-center text-sm text-(--text-color3)">
                    <span className="block font-['F1_Bold'] text-2xl text-(--text-color)">
                      {topDnfConstructor.dnfs}
                    </span>
                    {t("constructorStandings.spotlight.values.dnfs")}
                  </p>
                </article>
              ) : null}

              {topPenaltyConstructor ? (
                <article className={spotlightCardClass}>
                  <h3 className="font-['F1_Bold'] text-lg text-(--text-color)">
                    {t("constructorStandings.spotlight.mostPenalties")}
                  </h3>
                  <p className="mt-1 text-sm text-(--text-color3)">
                    {t("constructorStandings.spotlight.penaltiesDescription", {
                      team: topPenaltyConstructor.team.Constructor.name,
                      season: selectedSeason,
                    })}
                  </p>
                  <p className="mt-4 text-center text-sm text-(--text-color3)">
                    <span className="block font-['F1_Bold'] text-2xl text-(--text-color)">
                      {topPenaltyConstructor.penalties}
                    </span>
                    {t("constructorStandings.spotlight.values.gridPenalties")}
                  </p>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {teams.length > 0 ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleExportStandings}
              className="inline-flex items-center justify-center rounded-full bg-(--color1) px-4 py-2.5 font-['F1_Bold'] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--color2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color1) focus-visible:ring-offset-2"
              aria-label={t("constructorStandings.exportAriaLabel", {
                season: selectedSeason,
              })}
            >
              {t("constructorStandings.exportCsv")}
            </button>
          </div>
        ) : null}

        <div className="pt-4" ref={listRef}>
          {teams.length === 0 ? (
            <EmptyState
              title={t("constructorStandings.empty.title")}
              message={t("constructorStandings.empty.message", {
                season: selectedSeason,
              })}
            />
          ) : (
            <div className="space-y-2.5">
              {teamsWithGaps.map(
                ({ standing: team, gapToLeader, gapToAhead, positionChange }) => {
                const teamName = team.Constructor.name;
                const colorClass = colorClasses[teamName] ?? "";
                const logoSrc = getTeamLogo(teamName);
                const flagCode = nationalityCountryCode(
                  team.Constructor.nationality
                );
                const wins = team.wins ?? "0";
                const positionChangePresentation = getPositionChangePresentation(
                  positionChange,
                  t
                );

                return (
                  <Link
                    to="/constructor/$id"
                    params={{ id: team.Constructor.constructorId }}
                    search={seasonSearchParams(selectedSeason)}
                    key={team.Constructor.constructorId}
                    aria-label={t("constructorStandings.constructorAriaLabel", {
                      team: teamName,
                    })}
                    className="group block"
                  >
                    <article className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-black/5 bg-(--background-buttons) p-3 shadow-[0_6px_18px_rgba(0,0,0,0.07)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-(--background-buttons-hover) hover:shadow-[0_10px_24px_rgba(0,0,0,0.1)] md:grid-cols-[auto_auto_1fr_auto] md:p-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`h-12 w-1.5 rounded-full bg-current ${colorClass}`}
                        />
                        <div className="flex flex-col items-center gap-1">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--background-color) font-['F1_Bold'] text-sm text-(--color3) ring-1 ring-black/10">
                            {team.position}
                          </span>
                          {positionChangePresentation ? (
                            <span
                              className={`inline-flex min-h-5 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-(--f1b) leading-none ${positionChangePresentation.className}`}
                            >
                              <span aria-hidden="true">
                                {positionChangePresentation.text}
                              </span>
                              <span className="sr-only">
                                {positionChangePresentation.label}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-(--background-color) p-2 ring-1 ring-black/5">
                          {logoSrc ? (
                            <img
                              className="max-h-8 max-w-11 object-contain"
                              src={logoSrc}
                              alt={t("constructorStandings.logoAlt", {
                                team: teamName,
                              })}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="font-['F1_Bold'] text-xs text-(--text-color3)"
                            >
                              {constructorInitials(teamName)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate font-['F1_Bold'] text-base text-(--text-color)">
                            {teamName}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-(--text-color3)">
                            <Flag
                              className="h-3.5 w-5 shrink-0 object-cover"
                              code={flagCode}
                            />
                            <span className="truncate">
                              {team.Constructor.nationality}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 grid grid-cols-2 gap-2 border-t border-black/10 pt-3 md:col-span-1 md:grid-cols-3 md:border-0 md:p-0">
                        <div className="col-span-2 rounded-xl bg-(--background-color) px-3 py-2 text-xs text-(--text-color3) ring-1 ring-black/5 md:col-span-1 md:min-w-32">
                          <span className="block text-center font-['F1_Bold'] uppercase tracking-[0.14em] text-(--text-color3)">
                            {t("constructorStandings.gapLabel")}
                          </span>
                          <div className="mt-2 space-y-1 text-center leading-5 text-(--text-color) md:text-left">
                            <p>
                              {t("constructorStandings.gapToLeader", {
                                gap: formatGap(gapToLeader, currentLanguage),
                              })}
                            </p>
                            <p>
                              {t("constructorStandings.gapToAhead", {
                                gap: formatGap(gapToAhead, currentLanguage),
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="rounded-xl bg-(--background-color) px-3 py-2 text-center text-xs text-(--text-color3) ring-1 ring-black/5 md:min-w-24">
                          <span className="block font-['F1_Bold'] text-base text-(--text-color)">
                            {team.points}
                          </span>
                          {t("constructorStandings.pointsAbbreviation")}
                        </p>
                        <p className="rounded-xl bg-(--background-color) px-3 py-2 text-center text-xs text-(--text-color3) ring-1 ring-black/5 md:min-w-20">
                          <span className="block font-['F1_Bold'] text-base text-(--text-color)">
                            {wins}
                          </span>
                          {t("constructorStandings.winsLabel")}
                        </p>
                      </div>
                    </article>
                  </Link>
                );
              }
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ConstructorStandings;
