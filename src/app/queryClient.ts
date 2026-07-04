import { QueryClient } from "@tanstack/react-query";
import type { DefaultOptions } from "@tanstack/react-query";

// App-wide TanStack Query defaults.
//
// Centralizing these in one module keeps the runtime provider configuration
// consistent and gives tests / future callers a single source of truth.
//
// Retry strategy: React Query retries are disabled (`retry: false`) because
// the axios layer already performs up to API_RETRY_ATTEMPTS smart retries
// (exponential back-off, only for retryable status codes via requestWithRetry).
// Letting React Query also retry would multiply network attempts:
//   (1 initial + 2 axios retries) × (1 + 2 RQ retries) = 9 attempts per query.
// With RQ retry disabled the maximum is 1 + 2 = 3 attempts — the intended limit.
export const queryClientDefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
    retry: false,
    throwOnError: true,
  },
  mutations: {
    retry: 0,
  },
} satisfies DefaultOptions;

export const queryClient = new QueryClient({
  defaultOptions: queryClientDefaultOptions,
});
