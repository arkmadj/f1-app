import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import i18n from "../../app/i18n";
import { renderWithRouter } from "../../test-utils/router";
import LandingPage from "./LandingPage";

vi.mock("../../components/RaceCountDown/RaceCountDown", () => ({
  default: () => <div>Race countdown</div>,
}));

vi.mock("../../components/LastRaceResults/LastRaceResults", () => ({
  default: () => <div>Last race results</div>,
}));

vi.mock("../../components/NewsFeed/NewsFeed", () => ({
  default: () => <div>News feed</div>,
}));

vi.mock("../../hooks/useStaggerFadeIn", () => ({
  default: () => ({ current: null }),
}));

const renderLandingPage = async (initialPath: string = "/") => {
  let rendered: Awaited<ReturnType<typeof renderWithRouter>> | undefined;

  await act(async () => {
    rendered = await renderWithRouter({
      initialPath,
      routes: [
        { path: "/", element: <LandingPage /> },
        { path: "/driver-comparison", element: <div>Driver comparison page</div> },
        {
          path: "/constructor-comparison",
          element: <div>Constructor comparison page</div>,
        },
        { path: "/season-leaders", element: <div>Season leaders page</div> },
      ],
    });
  });

  return rendered!;
};

describe("LandingPage", () => {
  it("renders the home sections", async () => {
    await renderLandingPage();

    expect(screen.getByText("Race countdown")).toBeInTheDocument();
    expect(await screen.findByText("Last race results")).toBeInTheDocument();
    expect(await screen.findByText("News feed")).toBeInTheDocument();
  });

  it("defers the lower landing sections until they approach the viewport", async () => {
    const observerCallbacks: IntersectionObserverCallback[] = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    const previousIntersectionObserver = globalThis.IntersectionObserver;
    const constructorSpy = vi.fn();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "320px 0px";
      readonly thresholds = [];

      constructor(callback: IntersectionObserverCallback) {
        constructorSpy();
        observerCallbacks.push(callback);
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }

    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    try {
      await renderLandingPage();

      expect(screen.getByText("Loading last race results")).toBeInTheDocument();
      expect(screen.getByText("Loading latest F1 news…")).toBeInTheDocument();
      expect(screen.queryByText("Last race results")).not.toBeInTheDocument();
      expect(screen.queryByText("News feed")).not.toBeInTheDocument();
      expect(constructorSpy).toHaveBeenCalledTimes(2);
      expect(observe).toHaveBeenCalledTimes(2);

      await act(async () => {
        observerCallbacks.forEach((callback) => {
          callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            {} as IntersectionObserver
          );
        });
      });

      expect(await screen.findByText("Last race results")).toBeInTheDocument();
      expect(await screen.findByText("News feed")).toBeInTheDocument();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      globalThis.IntersectionObserver = previousIntersectionObserver;
    }
  });

  it("renders direct comparison actions that preserve the selected season", async () => {
    await renderLandingPage("/?season=2023");

    expect(screen.getByRole("link", { name: "Compare Drivers" })).toHaveAttribute(
      "href",
      "/driver-comparison?season=2023"
    );
    expect(
      screen.getByRole("link", { name: "Compare Constructors" })
    ).toHaveAttribute("href", "/constructor-comparison?season=2023");
    expect(screen.getByRole("link", { name: "Season Leaders" })).toHaveAttribute(
      "href",
      "/season-leaders?season=2023"
    );
  });

  it("updates the document title when the language changes", async () => {
    await renderLandingPage();

    expect(document.title).toBe("Home");

    await act(async () => {
      await i18n.changeLanguage("es");
    });

    await waitFor(() => expect(document.title).toBe("Inicio"));
  });
});