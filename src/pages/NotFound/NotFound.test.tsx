import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SEASON,
  normalizeSeason,
  parseSearchParams,
  seasonSearchParams,
  stringifySearchParams,
} from "../../domain/f1/seasons";
import NotFound from "./NotFound";

function DestinationPage({ label }: { label: string }) {
  const season = useRouterState({
    select: (state) =>
      (state.location.search as { season?: string }).season ?? DEFAULT_SEASON,
  });

  return <div>{`${label} (${season})`}</div>;
}

const renderNotFound = async (initialPath: string = "/missing") => {
  const rootRoute = createRootRoute({
    validateSearch: (search: Record<string, unknown>) =>
      seasonSearchParams(normalizeSeason(search.season ?? DEFAULT_SEASON)),
    component: () => <Outlet />,
  });

  const routes = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <DestinationPage label="Home page" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/driverstandings",
      component: () => <DestinationPage label="Driver standings page" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/constructorstandings",
      component: () => <DestinationPage label="Constructor standings page" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/race",
      component: () => <DestinationPage label="Race results page" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/missing",
      component: NotFound,
    }),
  ];

  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    parseSearch: parseSearchParams,
    stringifySearch: stringifySearchParams,
  });

  await act(async () => {
    await router.load();
  });

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
};

describe("NotFound", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", {
      value: vi.fn(),
      writable: true,
    });
  });

  it("renders the 404 content and helpful quick links", async () => {
    await renderNotFound();

    expect(
      screen.getByRole("heading", { name: /404 — this lap went off track/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/yellow flag/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /the page you requested is not on the current f1 app two circuit/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/return to the starting grid/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/see the selected season title fight/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/track each team's points/i)).toBeInTheDocument();
    expect(screen.getByText(/browse grand prix results/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(
      screen.getByRole("link", { name: /driver standings/i })
    ).toHaveAttribute("href", "/driverstandings");
    expect(
      screen.getByRole("link", { name: /constructor standings/i })
    ).toHaveAttribute("href", "/constructorstandings");
    expect(screen.getByRole("link", { name: /race results/i })).toHaveAttribute(
      "href",
      "/race"
    );
  });

  it("preserves a non-default season in each quick link", async () => {
    await renderNotFound("/missing?season=2023");

    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/?season=2023"
    );
    expect(
      screen.getByRole("link", { name: /driver standings/i })
    ).toHaveAttribute("href", "/driverstandings?season=2023");
    expect(
      screen.getByRole("link", { name: /constructor standings/i })
    ).toHaveAttribute("href", "/constructorstandings?season=2023");
    expect(screen.getByRole("link", { name: /race results/i })).toHaveAttribute(
      "href",
      "/race?season=2023"
    );
  });

  it("navigates to the selected quick link and keeps the chosen season", async () => {
    const { router } = await renderNotFound("/missing?season=2023");

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: /driver standings/i }));
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/driverstandings");
      expect((router.state.location.search as { season?: string }).season).toBe(
        "2023"
      );
    });

    expect(
      screen.getByText("Driver standings page (2023)")
    ).toBeInTheDocument();
  });
});
