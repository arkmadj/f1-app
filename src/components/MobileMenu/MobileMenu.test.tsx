import { act, render, screen, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileMenu from "./MobileMenu";

const HomePage = () => (
  <>
    <MobileMenu />
    <div data-testid="route-home">Home page</div>
  </>
);

const MenuPage = () => (
  <>
    <MobileMenu />
    <div data-testid="route-menu">Menu page</div>
  </>
);

const renderMobileMenu = async (
  initialPath: string = "/menu"
): Promise<RenderResult> => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: HomePage,
  });
  const menuRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/menu",
    component: MenuPage,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, menuRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  await act(async () => {
    await router.load();
  });

  return render(<RouterProvider router={router} />);
};

describe("MobileMenu", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", {
      value: vi.fn(),
      writable: true,
    });
  });

  describe("rendering", () => {
    it("renders three icon links in the bottom menu", async () => {
      const { container } = await renderMobileMenu();

      const links = screen.getAllByRole("link");

      expect(links).toHaveLength(3);
      links.forEach((link) => expect(link).toHaveAttribute("href", "/"));
      expect(container.querySelectorAll("svg")).toHaveLength(3);
      expect(screen.getByTestId("route-menu")).toBeInTheDocument();
    });

    it("applies the shared mobile menu link styling to each link", async () => {
      await renderMobileMenu();

      screen.getAllByRole("link").forEach((link) => {
        expect(link).toHaveClass(
          "rounded-full",
          "p-2",
          "text-(--text-color)",
          "hover:bg-(--background-buttons-hover)"
        );
      });
    });
  });

  describe("basic interactions", () => {
    it.each([0, 1, 2])(
      "navigates to the home route when link %i is clicked",
      async (index) => {
        await renderMobileMenu();

        await userEvent.click(screen.getAllByRole("link")[index]);

        expect(await screen.findByTestId("route-home")).toBeInTheDocument();
        expect(screen.queryByTestId("route-menu")).not.toBeInTheDocument();
      }
    );
  });
});
