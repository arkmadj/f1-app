import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { getLatestF1News, type F1NewsItem } from "../../services/api/newsApi";
import { queryKeys } from "../../services/api/queryKeys";

type LatestF1NewsQueryKey = ReturnType<typeof queryKeys.news.latest>;

export type UseLatestF1NewsOptions = Omit<
  UseQueryOptions<F1NewsItem[], Error, F1NewsItem[], LatestF1NewsQueryKey>,
  "queryKey" | "queryFn"
>;

export const useLatestF1News = (
  limit: number = 6,
  options: UseLatestF1NewsOptions = {}
): UseQueryResult<F1NewsItem[], Error> =>
  useQuery({
    queryKey: queryKeys.news.latest(limit),
    queryFn: () => getLatestF1News(limit),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
