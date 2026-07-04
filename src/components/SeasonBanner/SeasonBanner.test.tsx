import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SeasonBanner from "./SeasonBanner";

describe("SeasonBanner", () => {
  it("renders the multi-season notice", () => {
    render(<SeasonBanner />);

    expect(
      screen.getByText(/multi-season mode is available/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dismiss season notice/i })
    ).toBeInTheDocument();
  });

  it("dismisses the notice when the dismiss button is clicked", () => {
    render(<SeasonBanner />);

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss season notice/i })
    );

    expect(
      screen.queryByText(/multi-season mode is available/i)
    ).not.toBeInTheDocument();
  });
});
