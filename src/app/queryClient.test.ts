import { describe, expect, it } from "vitest";
import { queryClient, queryClientDefaultOptions } from "./queryClient";

describe("app/queryClient", () => {
  it("exports the shared app query defaults", () => {
    expect(queryClientDefaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(queryClientDefaultOptions.queries?.gcTime).toBe(30 * 60 * 1000);
    expect(queryClientDefaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(queryClientDefaultOptions.queries?.refetchOnReconnect).toBe(true);
    expect(queryClientDefaultOptions.queries?.refetchOnMount).toBe(false);
    expect(queryClientDefaultOptions.queries?.retry).toBe(false);
    expect(queryClientDefaultOptions.queries?.throwOnError).toBe(true);
    expect(queryClientDefaultOptions.mutations?.retry).toBe(0);
  });

  it("initializes the shared QueryClient with the same defaults", () => {
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(
      queryClientDefaultOptions.queries?.staleTime
    );
    expect(defaults.queries?.gcTime).toBe(
      queryClientDefaultOptions.queries?.gcTime
    );
    expect(defaults.queries?.retry).toBe(
      queryClientDefaultOptions.queries?.retry
    );
    expect(defaults.queries?.throwOnError).toBe(
      queryClientDefaultOptions.queries?.throwOnError
    );
    expect(defaults.mutations?.retry).toBe(
      queryClientDefaultOptions.mutations?.retry
    );
  });
});
