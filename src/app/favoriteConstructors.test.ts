import { describe, expect, it } from "vitest";

import {
  favoriteConstructorsStorageKey,
  normalizeFavoriteConstructors,
  readFavoriteConstructors,
  saveFavoriteConstructors,
} from "./favoriteConstructors";

describe("favoriteConstructors", () => {
  it("normalizes constructor ids before persisting them", () => {
    const savedConstructors = saveFavoriteConstructors([
      " ferrari ",
      "mclaren",
      "ferrari",
      "",
    ]);

    expect(savedConstructors).toEqual(["ferrari", "mclaren"]);
    expect(window.localStorage.getItem(favoriteConstructorsStorageKey)).toBe(
      JSON.stringify(["ferrari", "mclaren"])
    );
  });

  it("reads normalized constructor ids from storage", () => {
    window.localStorage.setItem(
      favoriteConstructorsStorageKey,
      JSON.stringify([" red_bull ", "mercedes", "red_bull"])
    );

    expect(readFavoriteConstructors()).toEqual(["red_bull", "mercedes"]);
  });

  it("falls back to an empty list for invalid values", () => {
    expect(normalizeFavoriteConstructors(["alpine", 2026])).toEqual([]);

    window.localStorage.setItem(favoriteConstructorsStorageKey, "not-json");

    expect(readFavoriteConstructors()).toEqual([]);
  });
});