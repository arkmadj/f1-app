import { describe, expect, it } from "vitest";
import countryCode, { COUNTRY_CODE_MAP, type CountryName } from "./countryCode";

describe("countryCode", () => {
  describe("known country names", () => {
    it.each(Object.entries(COUNTRY_CODE_MAP))(
      "maps %s to %s",
      (name, expected) => {
        expect(countryCode(name)).toBe(expected);
      }
    );

    it("resolves canonical names returned by the Ergast API", () => {
      expect(countryCode("Italy")).toBe("IT");
      expect(countryCode("Japan")).toBe("JP");
      expect(countryCode("Brazil")).toBe("BR");
    });
  });

  describe("aliases", () => {
    it("treats UK and United Kingdom as GB", () => {
      expect(countryCode("UK")).toBe("GB");
      expect(countryCode("United Kingdom")).toBe("GB");
    });

    it("treats USA and United States as US", () => {
      expect(countryCode("USA")).toBe("US");
      expect(countryCode("United States")).toBe("US");
    });

    it("treats UAE and United Arab Emirates as AE", () => {
      expect(countryCode("UAE")).toBe("AE");
      expect(countryCode("United Arab Emirates")).toBe("AE");
    });
  });

  describe("input normalisation", () => {
    it("is case-insensitive", () => {
      expect(countryCode("italy")).toBe("IT");
      expect(countryCode("ITALY")).toBe("IT");
      expect(countryCode("iTaLy")).toBe("IT");
    });

    it("trims surrounding whitespace", () => {
      expect(countryCode("  Italy  ")).toBe("IT");
      expect(countryCode("\tJapan\n")).toBe("JP");
    });

    it("normalises case for multi-word names", () => {
      expect(countryCode("saudi arabia")).toBe("SA");
      expect(countryCode("SAUDI ARABIA")).toBe("SA");
      expect(countryCode("  united kingdom  ")).toBe("GB");
    });

    it("does not collapse internal whitespace", () => {
      // Only leading/trailing whitespace is stripped; the lookup key is exact.
      expect(countryCode("Saudi  Arabia")).toBe("");
    });
  });

  describe("unrecognised or invalid input", () => {
    it("returns an empty string for unknown countries", () => {
      expect(countryCode("Atlantis")).toBe("");
      expect(countryCode("Wakanda")).toBe("");
    });

    it("returns an empty string for empty or whitespace-only input", () => {
      expect(countryCode("")).toBe("");
      expect(countryCode("   ")).toBe("");
      expect(countryCode("\t\n")).toBe("");
    });

    it("returns an empty string for null and undefined", () => {
      expect(countryCode(null)).toBe("");
      expect(countryCode(undefined)).toBe("");
    });

    it("returns an empty string for non-string inputs", () => {
      // Force-cast to exercise the runtime guard for callers using plain JS.
      expect(countryCode(123 as unknown as string)).toBe("");
      expect(countryCode({} as unknown as string)).toBe("");
      expect(countryCode([] as unknown as string)).toBe("");
      expect(countryCode(true as unknown as string)).toBe("");
      expect(countryCode((() => "Italy") as unknown as string)).toBe("");
    });

    it("does not match partial or substring inputs", () => {
      expect(countryCode("Ital")).toBe("");
      expect(countryCode("Italy!")).toBe("");
      expect(countryCode("South Italy")).toBe("");
    });
  });

  describe("module exports", () => {
    it("exposes the same function as default and named export semantics", () => {
      // The default export is the function itself.
      expect(typeof countryCode).toBe("function");
      expect(countryCode("Monaco")).toBe("MC");
    });

    it("freezes COUNTRY_CODE_MAP to prevent mutation", () => {
      expect(Object.isFrozen(COUNTRY_CODE_MAP)).toBe(true);
      expect(() => {
        // @ts-expect-error - intentional runtime mutation attempt
        COUNTRY_CODE_MAP.Italy = "ZZ";
      }).toThrow();
      expect(COUNTRY_CODE_MAP.Italy).toBe("IT");
    });

    it("contains only ISO 3166-1 alpha-2 style codes", () => {
      for (const [name, code] of Object.entries(COUNTRY_CODE_MAP)) {
        expect(code, `code for ${name}`).toMatch(/^[A-Z]{2}$/);
      }
    });

    it("contains the expected alias coverage", () => {
      const aliases: Array<[CountryName, CountryName]> = [
        ["UK", "United Kingdom"],
        ["USA", "United States"],
        ["UAE", "United Arab Emirates"],
      ];
      for (const [shortName, longName] of aliases) {
        expect(COUNTRY_CODE_MAP[shortName]).toBe(COUNTRY_CODE_MAP[longName]);
      }
    });
  });

  describe("idempotence", () => {
    it("returns the same result for repeated calls", () => {
      const first = countryCode("Australia");
      const second = countryCode("Australia");
      expect(first).toBe("AU");
      expect(second).toBe(first);
    });

    it("handles a mix of valid and invalid inputs in sequence", () => {
      const inputs = ["Italy", "nope", "  Japan  ", "", null, "USA"];
      const results = inputs.map((value) => countryCode(value));
      expect(results).toEqual(["IT", "", "JP", "", "", "US"]);
    });
  });
});
