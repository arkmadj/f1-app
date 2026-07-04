import { useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  DEFAULT_SEASON,
  normalizeSeason,
  type Season,
} from "../domain/f1/seasons";

interface SearchState {
  season?: unknown;
}

interface UseSelectedSeasonResult {
  selectedSeason: Season;
  setSelectedSeason: (season: Season) => void;
}

type SeasonSearchUpdater = (previous: { season?: string }) => {
  season?: string;
};

export const useSelectedSeason = (): UseSelectedSeasonResult => {
  const navigate = useNavigate();
  const rawSeason = useRouterState({
    select: (state) => (state.location.search as SearchState).season,
  });
  const selectedSeason = normalizeSeason(rawSeason ?? DEFAULT_SEASON);

  const setSelectedSeason = useCallback(
    (season: Season): void => {
      const nextSeason = normalizeSeason(season);
      const updateSearch: SeasonSearchUpdater = (previous) => ({
        ...previous,
        season: nextSeason === DEFAULT_SEASON ? undefined : nextSeason,
      });

      void navigate({
        search: updateSearch as never,
      });
    },
    [navigate]
  );

  return { selectedSeason, setSelectedSeason };
};
