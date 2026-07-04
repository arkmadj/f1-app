import { describe, expect, it } from "vitest";
import permanentNumber, { getPermanentNumberImage } from "./permanentNumber";

describe("permanentNumber", () => {
  it.each(Object.entries(permanentNumber))(
    "maps permanent number %s to its image",
    (number, expectedImage) => {
      expect(getPermanentNumberImage(Number(number))).toBe(expectedImage);
    }
  );

  it("accepts numeric strings and trims surrounding whitespace", () => {
    expect(getPermanentNumberImage("44")).toBe(permanentNumber[44]);
    expect(getPermanentNumberImage("  44  ")).toBe(permanentNumber[44]);
  });

  it("normalizes numeric string representations before lookup", () => {
    expect(getPermanentNumberImage("044")).toBe(permanentNumber[44]);
    expect(getPermanentNumberImage("44.0")).toBe(permanentNumber[44]);
  });

  it("returns undefined for unknown or missing permanent numbers", () => {
    expect(getPermanentNumberImage(999)).toBeUndefined();
    expect(getPermanentNumberImage("999")).toBeUndefined();
    expect(getPermanentNumberImage(null)).toBeUndefined();
    expect(getPermanentNumberImage(undefined)).toBeUndefined();
  });

  it("returns undefined for invalid numeric values", () => {
    expect(getPermanentNumberImage(Number.NaN)).toBeUndefined();
    expect(getPermanentNumberImage(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(getPermanentNumberImage("not-a-number")).toBeUndefined();
    expect(getPermanentNumberImage("   ")).toBeUndefined();
  });

  it("exports an immutable permanent number map", () => {
    expect(Object.isFrozen(permanentNumber)).toBe(true);
    expect(() => {
      (permanentNumber as Record<number, string>)[44] = "changed";
    }).toThrow();
    expect(permanentNumber[44]).not.toBe("changed");
  });
});
