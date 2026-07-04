import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

interface BombProps {
  error?: Error;
}

function Bomb({ error }: BombProps): JSX.Element {
  if (error) {
    throw error;
  }

  return <div>Healthy child</div>;
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no descendant throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("Healthy child")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("catches descendant errors and renders the fallback UI", () => {
    const error = new Error("boom");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Bomb error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we could not load this content\. please try again\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();

    if (import.meta.env.DEV) {
      expect(screen.getByText("boom")).toBeInTheDocument();
    }

    expect(consoleError).toHaveBeenCalledWith(
      "ErrorBoundary caught an error:",
      error,
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it("clears the fallback and retries rendering after clicking Try again", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const error = new Error("boom");
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb error={error} />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Healthy child")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });
});
