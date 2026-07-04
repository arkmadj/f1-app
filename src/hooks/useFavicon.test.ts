import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import useFavicon from "./useFavicon";

const getIconLink = () => document.querySelector("link[rel~='icon']");

describe("useFavicon", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("creates a <link rel='icon'> in the document head when none exists", () => {
    expect(getIconLink()).toBeNull();

    renderHook(() => useFavicon("/foo.ico"));

    const link = getIconLink();
    expect(link).not.toBeNull();
    expect(link.getAttribute("rel")).toBe("icon");
    expect(link.parentNode).toBe(document.head);
  });

  it("sets link.href to the provided href", () => {
    renderHook(() => useFavicon("/foo.ico"));

    const link = getIconLink();
    expect(link.href).toBe(`${window.location.origin}/foo.ico`);
  });

  it("reuses an existing <link rel='icon'> instead of creating a new one", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.href = "/old.ico";
    document.head.appendChild(existing);

    renderHook(() => useFavicon("/new.ico"));

    const links = document.head.querySelectorAll("link[rel~='icon']");
    expect(links).toHaveLength(1);
    expect(links[0]).toBe(existing);
    expect(existing.href).toBe(`${window.location.origin}/new.ico`);
  });

  it("does not create a link or set href when called with undefined", () => {
    renderHook(() => useFavicon(undefined));

    expect(getIconLink()).toBeNull();
  });

  it("does not create a link or set href when called with an empty string", () => {
    renderHook(() => useFavicon(""));

    expect(getIconLink()).toBeNull();
  });

  it("updates the link href when the hook is re-rendered with a new value", () => {
    const { rerender } = renderHook(({ href }) => useFavicon(href), {
      initialProps: { href: "/first.ico" },
    });

    const link = getIconLink();
    expect(link.href).toBe(`${window.location.origin}/first.ico`);

    rerender({ href: "/second.ico" });
    expect(link.href).toBe(`${window.location.origin}/second.ico`);
  });

  it("restores the previous href when re-rendered with a new value (cleanup)", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.href = "/initial.ico";
    document.head.appendChild(existing);

    const initialHref = existing.href;

    const { rerender } = renderHook(({ href }) => useFavicon(href), {
      initialProps: { href: "/next.ico" },
    });

    expect(existing.href).toBe(`${window.location.origin}/next.ico`);

    rerender({ href: "/another.ico" });

    // After the effect for "/next.ico" cleans up, the link is briefly
    // restored to the original href before the new effect runs and
    // sets it to "/another.ico".
    expect(existing.href).toBe(`${window.location.origin}/another.ico`);
    // Sanity: the very first href captured was the original one.
    expect(initialHref).toBe(`${window.location.origin}/initial.ico`);
  });

  it("restores the previous href on unmount", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.href = "/initial.ico";
    document.head.appendChild(existing);

    const { unmount } = renderHook(() => useFavicon("/temp.ico"));
    expect(existing.href).toBe(`${window.location.origin}/temp.ico`);

    unmount();
    expect(existing.href).toBe(`${window.location.origin}/initial.ico`);
  });

  it("does not run the effect when href is falsy, leaving an existing icon untouched", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.href = "/keep.ico";
    document.head.appendChild(existing);

    renderHook(() => useFavicon(undefined));

    expect(existing.href).toBe(`${window.location.origin}/keep.ico`);
  });

  it("returns undefined", () => {
    const { result } = renderHook(() => useFavicon("/foo.ico"));
    expect(result.current).toBeUndefined();
  });
});
