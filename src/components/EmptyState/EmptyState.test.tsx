import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders an accessible heading and helpful message", () => {
    render(
      <EmptyState
        title="No race data available"
        message="Check back after the Grand Prix classification is published."
      />
    );

    const heading = screen.getByRole("heading", {
      name: "No race data available",
    });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check back after the Grand Prix classification is published."
      )
    ).toBeInTheDocument();
    expect(heading.closest("section")).toHaveAttribute(
      "aria-labelledby",
      heading.id
    );
  });

  it("supports custom icons, actions, and additional classes", () => {
    const { container } = render(
      <EmptyState
        title="No constructors found"
        icon={<span data-testid="custom-icon">🏎️</span>}
        action={<a href="/constructorstandings">View standings</a>}
        className="extra-empty-state-class"
      />
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View standings" })
    ).toHaveAttribute("href", "/constructorstandings");
    expect(container.querySelector(".EmptyState")).toHaveClass(
      "extra-empty-state-class"
    );
  });
});
