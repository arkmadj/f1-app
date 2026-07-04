import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AVAILABLE_SEASONS } from "../../domain/f1/seasons";

const useSelectedSeasonMock = vi.fn();

vi.mock("../../hooks/useSelectedSeason", () => ({
  useSelectedSeason: () => useSelectedSeasonMock(),
}));

import SeasonSelector from "./SeasonSelector";

describe("SeasonSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSelectedSeasonMock.mockReturnValue({
      selectedSeason: "2024",
      setSelectedSeason: vi.fn(),
    });
  });

  it("renders a custom season combobox with the selected season", () => {
    const { container } = render(<SeasonSelector />);

    expect(
      screen.getByRole("combobox", { name: /select f1 season/i })
    ).toHaveTextContent("2024");
    expect(container.querySelector("select")).not.toBeInTheDocument();
  });

  it("shows context for what the season control changes", () => {
    render(<SeasonSelector />);

    expect(screen.getByText("Season")).toBeInTheDocument();
    expect(screen.getByText("Championship year")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /select f1 season/i })
    ).toHaveAccessibleDescription(/championship year/i);
  });

  it("renders all available season options", () => {
    render(<SeasonSelector />);

    fireEvent.click(
      screen.getByRole("combobox", { name: /select f1 season/i })
    );

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(AVAILABLE_SEASONS.length);

    AVAILABLE_SEASONS.forEach((season) => {
      expect(
        screen.getByRole("option", { name: `${season} Season` })
      ).toHaveAttribute("aria-selected", season === "2024" ? "true" : "false");
    });
  });

  it("calls setSelectedSeason with the newly chosen season", () => {
    const setSelectedSeason = vi.fn();
    useSelectedSeasonMock.mockReturnValue({
      selectedSeason: "2024",
      setSelectedSeason,
    });

    render(<SeasonSelector />);

    fireEvent.click(
      screen.getByRole("combobox", { name: /select f1 season/i })
    );
    fireEvent.click(screen.getByRole("option", { name: "2023 Season" }));

    expect(setSelectedSeason).toHaveBeenCalledTimes(1);
    expect(setSelectedSeason).toHaveBeenCalledWith("2023");
  });

  it("supports keyboard selection from the custom dropdown", () => {
    const setSelectedSeason = vi.fn();
    useSelectedSeasonMock.mockReturnValue({
      selectedSeason: "2024",
      setSelectedSeason,
    });

    render(<SeasonSelector />);

    const combobox = screen.getByRole("combobox", {
      name: /select f1 season/i,
    });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(setSelectedSeason).toHaveBeenCalledTimes(1);
    expect(setSelectedSeason).toHaveBeenCalledWith("2023");
  });

  it("merges a custom className onto the wrapper", () => {
    const { container } = render(<SeasonSelector className="toolbar-season" />);

    expect(container.firstElementChild).toHaveClass("toolbar-season");
  });
});
