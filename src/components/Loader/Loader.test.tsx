import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Loader from "./Loader";

const setMatchMedia = (matches) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("Loader", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders the default 'Loading' label", () => {
      render(<Loader />);
      // visible label (no sr-only ellipsis) and screen-reader label both exist
      expect(screen.getByText("Loading")).toBeInTheDocument();
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("renders a custom label when provided", () => {
      render(<Loader label="Fetching drivers" />);
      expect(screen.getByText("Fetching drivers")).toBeInTheDocument();
      expect(screen.getByText("Fetching drivers…")).toBeInTheDocument();
    });

    it("renders exactly three animated trailing dots", () => {
      const { container } = render(<Loader />);
      const dots = container.querySelectorAll(".Loader__dot");
      expect(dots).toHaveLength(3);
      dots.forEach((dot) => expect(dot).toHaveTextContent("."));
      expect(dots[1]).toHaveStyle({ animationDelay: "0.2s" });
      expect(dots[2]).toHaveStyle({ animationDelay: "0.4s" });
    });
  });

  describe("animation states", () => {
    it("renders the animated stage with both spinning rings, hub, and flag", () => {
      const { container } = render(<Loader />);
      const stage = container.querySelector(".Loader__stage");
      expect(stage).toBeInTheDocument();
      expect(stage.querySelector(".Loader__ring--outer")).toBeInTheDocument();
      expect(stage.querySelector(".Loader__ring--inner")).toBeInTheDocument();
      expect(stage.querySelector(".Loader__hub")).toBeInTheDocument();
      expect(stage.querySelector(".Loader__flag")).toBeInTheDocument();
    });

    it("hides the decorative stage from assistive tech", () => {
      const { container } = render(<Loader />);
      const stage = container.querySelector(".Loader__stage");
      expect(stage).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("accessibility attributes", () => {
    it("exposes a polite, busy status region", () => {
      render(<Loader />);
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("provides a screen-reader-only label distinct from the visual one", () => {
      const { container } = render(<Loader label="Loading data" />);
      const srOnly = container.querySelector(".Loader__sr-only");
      expect(srOnly).toBeInTheDocument();
      expect(srOnly).toHaveTextContent("Loading data…");
    });

    it("has no axe-incompatible interactive children (status is non-interactive)", () => {
      render(<Loader />);
      // No buttons, links, or inputs should leak into a passive status region.
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("reduced-motion behavior", () => {
    beforeEach(() => {
      setMatchMedia(true);
    });

    it("still renders all structural elements when reduced motion is preferred", () => {
      const { container } = render(<Loader />);
      // The component is CSS-driven, so DOM structure must be identical;
      // only the @media rule strips animations visually.
      expect(
        container.querySelector(".Loader__ring--outer")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".Loader__ring--inner")
      ).toBeInTheDocument();
      expect(container.querySelector(".Loader__hub")).toBeInTheDocument();
      expect(container.querySelector(".Loader__flag")).toBeInTheDocument();
      expect(container.querySelectorAll(".Loader__dot")).toHaveLength(3);
    });

    it("applies Tailwind reduced-motion utility classes to animated elements", () => {
      const { container } = render(<Loader />);

      expect(container.querySelector(".Loader__ring--outer")).toHaveClass(
        "motion-reduce:animate-none"
      );
      expect(container.querySelector(".Loader__ring--inner")).toHaveClass(
        "motion-reduce:animate-none"
      );
      expect(container.querySelector(".Loader__hub")).toHaveClass(
        "motion-reduce:animate-none"
      );
      expect(container.querySelector(".Loader__flag")).toHaveClass(
        "motion-reduce:animate-none"
      );
      expect(container.querySelector(".Loader__label")).toHaveClass(
        "motion-reduce:animate-none",
        "motion-reduce:opacity-90"
      );
      container.querySelectorAll(".Loader__dot").forEach((dot) => {
        expect(dot).toHaveClass("motion-reduce:animate-none");
      });
    });

    it("keeps the status role exposed regardless of motion preference", () => {
      render(<Loader />);
      expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    });
  });
});
