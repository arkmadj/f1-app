import { describe, expect, it } from "vitest";
import nationalityToCountryCode, { nationalityCountryCode } from "./images";

describe("images", () => {
  describe("known nationalities", () => {
    it.each(Object.entries(nationalityToCountryCode))(
      "maps %s to %s",
      (nationality, expectedCode) => {
        expect(nationalityCountryCode(nationality)).toBe(expectedCode);
      }
    );

    it("resolves common Jolpica/Ergast nationalities", () => {
      expect(nationalityCountryCode("British")).toBe("GB");
      expect(nationalityCountryCode("Dutch")).toBe("NL");
      expect(nationalityCountryCode("Monegasque")).toBe("MC");
    });
  });

  describe("input normalisation", () => {
    it("is case-insensitive", () => {
      expect(nationalityCountryCode("british")).toBe("GB");
      expect(nationalityCountryCode("BRITISH")).toBe("GB");
      expect(nationalityCountryCode("bRiTiSh")).toBe("GB");
    });

    it("trims surrounding whitespace", () => {
      expect(nationalityCountryCode("  Dutch  ")).toBe("NL");
      expect(nationalityCountryCode("\tJapanese\n")).toBe("JP");
    });

    it("does not collapse internal whitespace", () => {
      expect(nationalityCountryCode("Mone gasque")).toBe("");
    });
  });

  describe("unrecognised or invalid input", () => {
    it("returns an empty string for unknown values", () => {
      expect(nationalityCountryCode("Martian")).toBe("");
      expect(nationalityCountryCode("British!")).toBe("");
    });

    it("returns an empty string for empty or whitespace-only input", () => {
      expect(nationalityCountryCode("")).toBe("");
      expect(nationalityCountryCode("   ")).toBe("");
      expect(nationalityCountryCode("\t\n")).toBe("");
    });

    it("returns an empty string for null, undefined, and non-string inputs", () => {
      expect(nationalityCountryCode(null)).toBe("");
      expect(nationalityCountryCode(undefined)).toBe("");
      expect(nationalityCountryCode(123 as unknown as string)).toBe("");
      expect(nationalityCountryCode({} as unknown as string)).toBe("");
    });
  });

  describe("module exports", () => {
    it("exports an immutable nationality map", () => {
      expect(Object.isFrozen(nationalityToCountryCode)).toBe(true);
      expect(() => {
        (nationalityToCountryCode as Record<string, string>).British = "ZZ";
      }).toThrow();
      expect(nationalityToCountryCode.British).toBe("GB");
    });

    it("contains ISO 3166-1 alpha-2 style codes", () => {
      for (const [nationality, code] of Object.entries(
        nationalityToCountryCode
      )) {
        expect(code, `code for ${nationality}`).toMatch(/^[A-Z]{2}$/);
      }
    });
  });
});
