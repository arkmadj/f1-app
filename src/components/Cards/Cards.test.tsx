import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { useRouterState } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SEASON } from "../../domain/f1/seasons";
import { renderWithRouter } from "../../test-utils/router";
import Cards from "./Cards";

const cardLinks = [
  {
    name: "Driver Standings",
    path: "/driverstandings",
    label: "Driver standings page",
  },
  {
    name: "Constructor Standings",
    path: "/constructorstandings",
    label: "Constructor standings page",
  },
  { name: "Race Calendar", path: "/schedule", label: "Schedule page" },
  { name: "Qualifyings", path: "/qualifying", label: "Qualifying page" },
  { name: "Race Results", path: "/race", label: "Race results page" },
] as const;

function DestinationPage({ label }: { label: string }) {
  const season = useRouterState({
    select: (state) =>
      (state.location.search as { season?: string }).season ?? DEFAULT_SEASON,
  });

  return <div>{`${label} (${season})`}</div>;
}

const renderCards = async (initialPath: string = "/") => {
  let rendered: Awaited<ReturnType<typeof renderWithRouter>> | undefined;

  await act(async () => {
    rendered = await renderWithRouter({
      initialPath,
      routes: [
        { path: "/", element: <Cards /> },
        ...cardLinks.map(({ path, label }) => ({
          path,
          element: <DestinationPage label={label} />,
        })),
      ],
    });
  });

  return rendered!;
};

describe("Cards", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", {
      value: vi.fn(),
      writable: true,
    });
  });

  it("renders the welcome heading and each landing link", async () => {
    await renderCards();

    expect(
      screen.getByRole("heading", { name: /welcome to the f1 app/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(cardLinks.length);

    for (const { name, path } of cardLinks) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", path);
    }
  });

  it("preserves a non-default selected season in every landing link", async () => {
    await renderCards("/?season=2023");

    for (const { name, path } of cardLinks) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "href",
        `${path}?season=2023`
      );
    }
  });

  it("omits the season query when the current season is default or invalid", async () => {
    await renderCards("/?season=not-a-season");

    for (const { name, path } of cardLinks) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", path);
    }
  });

  it("navigates to the selected card destination and keeps the chosen season", async () => {
    const { router } = await renderCards("/?season=2023");

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Race Results" }));
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/race");
      expect((router.state.location.search as { season?: string }).season).toBe(
        "2023"
      );
    });

    expect(screen.getByText("Race results page (2023)")).toBeInTheDocument();
  });
});
