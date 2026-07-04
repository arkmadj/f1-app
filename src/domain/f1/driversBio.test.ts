import { describe, expect, it } from "vitest";
import driversBio, { getDriverBio } from "./driversBio";

describe("driversBio", () => {
  describe("getDriverBio", () => {
    it.each(Object.entries(driversBio))(
      "returns the mapped biography for %s",
      (driverId, expectedBio) => {
        expect(getDriverBio(driverId)).toBe(expectedBio);
      }
    );

    it("normalises case and trims surrounding whitespace", () => {
      expect(getDriverBio("  MAX_VERSTAPPEN  ")).toBe(
        driversBio.max_verstappen
      );
      expect(getDriverBio(" HaMilTon ")).toBe(driversBio.hamilton);
      expect(getDriverBio("\tleclerc\n")).toBe(driversBio.leclerc);
    });

    it("returns undefined for unknown or missing driver ids", () => {
      expect(getDriverBio("unknown_driver")).toBeUndefined();
      expect(getDriverBio("")).toBeUndefined();
      expect(getDriverBio("   ")).toBeUndefined();
      expect(getDriverBio(null)).toBeUndefined();
      expect(getDriverBio(undefined)).toBeUndefined();
    });

    it("returns undefined for non-string runtime inputs", () => {
      expect(getDriverBio(123 as unknown as string)).toBeUndefined();
      expect(getDriverBio({} as unknown as string)).toBeUndefined();
      expect(getDriverBio([] as unknown as string)).toBeUndefined();
      expect(
        getDriverBio((() => "hamilton") as unknown as string)
      ).toBeUndefined();
    });
  });

  describe("module exports", () => {
    it("exports an immutable biography map", () => {
      expect(Object.isFrozen(driversBio)).toBe(true);
      expect(() => {
        (driversBio as Record<string, string>).hamilton = "Changed";
      }).toThrow();
      expect(driversBio.hamilton).toContain("Hammertime");
    });

    it("stores display-ready biographies without leading or trailing whitespace", () => {
      for (const [driverId, bio] of Object.entries(driversBio)) {
        expect(bio, `bio for ${driverId}`).toBe(bio.trim());
      }
    });

    it("stores biographies as single formatted paragraphs", () => {
      for (const [driverId, bio] of Object.entries(driversBio)) {
        expect(bio, `bio for ${driverId}`).not.toMatch(/[\r\n]/);
        expect(bio.length, `bio for ${driverId}`).toBeGreaterThan(40);
      }
    });
  });
});
