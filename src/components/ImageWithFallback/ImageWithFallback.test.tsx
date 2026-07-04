import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImageWithFallback from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  describe("loading / happy-path rendering", () => {
    it("renders an <img> with the provided src and alt when src is present", () => {
      render(<ImageWithFallback src="/foo.png" alt="Foo" />);

      const img = screen.getByRole("img", { name: "Foo" });
      expect(img.tagName).toBe("IMG");
      expect(img).toHaveAttribute("src", "/foo.png");
      expect(img).toHaveAttribute("alt", "Foo");
    });

    it("applies the supplied className to the rendered <img>", () => {
      render(
        <ImageWithFallback src="/foo.png" alt="Foo" className="thumb large" />
      );

      expect(screen.getByRole("img", { name: "Foo" })).toHaveClass(
        "thumb",
        "large"
      );
    });

    it("spreads additional props through to the underlying <img>", () => {
      render(
        <ImageWithFallback
          src="/foo.png"
          alt="Foo"
          width={120}
          loading="lazy"
          data-testid="hero"
        />
      );

      const img = screen.getByTestId("hero");
      expect(img).toHaveAttribute("width", "120");
      expect(img).toHaveAttribute("loading", "lazy");
    });

    it("defaults alt to an empty string when not provided", () => {
      render(<ImageWithFallback src="/foo.png" data-testid="img" />);

      expect(screen.getByTestId("img")).toHaveAttribute("alt", "");
    });
  });

  describe("error state", () => {
    it("swaps to fallbackSrc <img> when the primary image fails to load", () => {
      render(
        <ImageWithFallback
          src="/broken.png"
          alt="Driver"
          fallbackSrc="/placeholder.png"
        />
      );

      const original = screen.getByRole("img", { name: "Driver" });
      expect(original).toHaveAttribute("src", "/broken.png");

      fireEvent.error(original);

      const swapped = screen.getByRole("img", { name: "Driver" });
      expect(swapped).toHaveAttribute("src", "/placeholder.png");
      expect(swapped).not.toHaveAttribute("src", "/broken.png");
    });

    it("swaps to the placeholder element when there is no fallbackSrc", () => {
      render(<ImageWithFallback src="/broken.png" alt="Driver" />);

      const original = screen.getByRole("img", { name: "Driver" });
      fireEvent.error(original);

      const placeholder = screen.getByRole("img", { name: "Driver" });
      expect(placeholder.tagName).toBe("DIV");
      expect(placeholder).toHaveClass("image-fallback");
      expect(placeholder.querySelector("svg")).not.toBeNull();
    });

    it("calls a consumer onError handler while still showing the fallback", () => {
      const onError = vi.fn();

      render(
        <ImageWithFallback src="/broken.png" alt="Driver" onError={onError} />
      );

      fireEvent.error(screen.getByRole("img", { name: "Driver" }));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("img", { name: "Driver" }).tagName).toBe("DIV");
    });

    it("preserves className on the swapped fallback <img>", () => {
      render(
        <ImageWithFallback
          src="/broken.png"
          alt="Driver"
          className="thumb"
          fallbackSrc="/placeholder.png"
        />
      );

      fireEvent.error(screen.getByRole("img", { name: "Driver" }));

      expect(screen.getByRole("img", { name: "Driver" })).toHaveClass("thumb");
    });

    it("resets the error state and re-attempts loading when src changes", () => {
      const { rerender } = render(
        <ImageWithFallback src="/broken.png" alt="Driver" />
      );

      fireEvent.error(screen.getByRole("img", { name: "Driver" }));
      // After erroring without a fallbackSrc we are showing the placeholder div.
      expect(screen.getByRole("img", { name: "Driver" }).tagName).toBe("DIV");

      rerender(<ImageWithFallback src="/working.png" alt="Driver" />);

      const recovered = screen.getByRole("img", { name: "Driver" });
      expect(recovered.tagName).toBe("IMG");
      expect(recovered).toHaveAttribute("src", "/working.png");
    });
  });

  describe("missing src", () => {
    it("renders fallbackSrc <img> when src is omitted", () => {
      render(
        <ImageWithFallback
          alt="Team logo"
          fallbackSrc="/placeholder.png"
          className="logo"
        />
      );

      const img = screen.getByRole("img", { name: "Team logo" });
      expect(img.tagName).toBe("IMG");
      expect(img).toHaveAttribute("src", "/placeholder.png");
      expect(img).toHaveClass("logo");
    });

    it("renders the placeholder element when src and fallbackSrc are both absent", () => {
      render(<ImageWithFallback alt="Team logo" />);

      const placeholder = screen.getByRole("img", { name: "Team logo" });
      expect(placeholder.tagName).toBe("DIV");
      expect(placeholder).toHaveClass("image-fallback");
    });

    it("treats an empty-string src the same as a missing src", () => {
      render(<ImageWithFallback src="" alt="Empty" />);

      expect(screen.getByRole("img", { name: "Empty" }).tagName).toBe("DIV");
    });
  });

  describe("placeholder accessibility and content", () => {
    it("uses alt as the aria-label when both alt and fallbackLabel are provided", () => {
      render(<ImageWithFallback alt="Driver photo" fallbackLabel="Driver" />);

      expect(
        screen.getByRole("img", { name: "Driver photo" })
      ).toBeInTheDocument();
    });

    it("falls back to fallbackLabel when alt is empty", () => {
      render(<ImageWithFallback fallbackLabel="Driver" />);

      expect(screen.getByRole("img", { name: "Driver" })).toBeInTheDocument();
    });

    it("uses 'Image not available' when neither alt nor fallbackLabel is given", () => {
      render(<ImageWithFallback />);

      expect(
        screen.getByRole("img", { name: "Image not available" })
      ).toBeInTheDocument();
    });

    it("renders the fallbackLabel as a visible <span> when provided", () => {
      render(<ImageWithFallback fallbackLabel="No photo" />);

      const placeholder = screen.getByRole("img", { name: "No photo" });
      const label = placeholder.querySelector(".image-fallback-label");
      expect(label).not.toBeNull();
      expect(label).toHaveTextContent("No photo");
    });

    it("does not render a label <span> when fallbackLabel is omitted", () => {
      render(<ImageWithFallback alt="Empty" />);

      const placeholder = screen.getByRole("img", { name: "Empty" });
      expect(placeholder.querySelector(".image-fallback-label")).toBeNull();
    });

    it("marks the decorative svg icon as aria-hidden", () => {
      render(<ImageWithFallback alt="Empty" />);

      const svg = screen
        .getByRole("img", { name: "Empty" })
        .querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    });

    it("appends the supplied className to the placeholder's base class", () => {
      render(<ImageWithFallback alt="Empty" className="rounded" />);

      expect(screen.getByRole("img", { name: "Empty" })).toHaveClass(
        "image-fallback",
        "rounded"
      );
    });

    it("appends fallbackClassName to the placeholder wrapper when provided", () => {
      render(
        <ImageWithFallback
          alt="Empty"
          className="rounded"
          fallbackClassName="border-0 bg-transparent p-0"
        />
      );

      expect(screen.getByRole("img", { name: "Empty" })).toHaveClass(
        "image-fallback",
        "rounded",
        "border-0",
        "bg-transparent",
        "p-0"
      );
    });

    it("renders custom fallbackContent instead of the default placeholder artwork", () => {
      render(
        <ImageWithFallback
          alt="Driver"
          fallbackContent={<span data-testid="silhouette">Silhouette</span>}
        />
      );

      const placeholder = screen.getByRole("img", { name: "Driver" });
      expect(screen.getByTestId("silhouette")).toBeInTheDocument();
      expect(placeholder.querySelector(".image-fallback-icon")).toBeNull();
    });

    it("keeps the semantic fallback class when no className is supplied", () => {
      render(<ImageWithFallback alt="Empty" />);

      expect(screen.getByRole("img", { name: "Empty" })).toHaveClass(
        "image-fallback"
      );
    });
  });
});
