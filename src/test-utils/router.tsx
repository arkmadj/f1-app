import type { ReactElement, ReactNode } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import {
  DEFAULT_SEASON,
  normalizeSeason,
  parseSearchParams,
  seasonSearchParams,
  stringifySearchParams,
} from "../domain/f1/seasons";

interface RouteSpec {
  path: string;
  element: ReactElement | (() => ReactNode);
  validateSearch?: (search: Record<string, unknown>) => Record<string, unknown>;
}

interface RenderWithRouterOptions {
  initialPath?: string;
  routes?: RouteSpec[];
  wrapper?: (children: ReactNode) => ReactElement;
}

const wrapAsComponent = (
  element: ReactElement | (() => ReactNode)
): (() => ReactNode) =>
  typeof element === "function" ? element : () => element;

/**
 * Render one or more components inside a TanStack Router context backed by a
 * memory history. Routes are registered with the supplied paths so that any
 * `useParams({ from })` and `<Link to>` calls inside the components resolve
 * against the same route ids used in production.
 */
export async function renderWithRouter({
  initialPath = "/",
  routes = [],
  wrapper,
}: RenderWithRouterOptions) {
  const rootRoute = createRootRoute({
    validateSearch: (search: Record<string, unknown>) =>
      seasonSearchParams(normalizeSeason(search.season ?? DEFAULT_SEASON)),
    component: () => <Outlet />,
  });

  const childRoutes = routes.map((spec) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: spec.path,
      validateSearch: spec.validateSearch,
      component: wrapAsComponent(spec.element),
    })
  );

  const router = createRouter({
    routeTree: rootRoute.addChildren(childRoutes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    parseSearch: parseSearchParams,
    stringifySearch: stringifySearchParams,
  });

  await router.load();

  const tree = <RouterProvider router={router} />;
  return {
    router,
    ...render(wrapper ? wrapper(tree) : tree),
  };
}
