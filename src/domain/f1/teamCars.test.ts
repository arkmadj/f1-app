import { describe, it, expect } from "vitest";
import teamCars, { getTeamCar, isTeamName, type TeamName } from "./teamCars";

// The full set of team names the map is expected to cover. Kept in sync
// with the `TeamName` union exported from `teamCars.ts`.
const EXPECTED_TEAM_NAMES: readonly TeamName[] = [
  "Mercedes",
  "Red Bull",
  "Ferrari",
  "Aston Martin",
  "Alpine F1 Team",
  "RB F1 Team",
  "Sauber",
  "McLaren",
  "Haas F1 Team",
  "Williams",
];

describe("domain/f1/teamCars", () => {
  describe("teamCars map", () => {
    it("exposes an entry for every supported team", () => {
      expect(Object.keys(teamCars).sort()).toEqual(
        [...EXPECTED_TEAM_NAMES].sort()
      );
    });

    it("does not expose any unexpected teams", () => {
      for (const key of Object.keys(teamCars)) {
        expect(EXPECTED_TEAM_NAMES).toContain(key as TeamName);
      }
    });

    it("resolves each team to a truthy asset reference", () => {
      for (const team of EXPECTED_TEAM_NAMES) {
        const asset = teamCars[team];
        expect(asset).toBeDefined();
        expect(typeof asset).toBe("string");
        expect(asset.length).toBeGreaterThan(0);
      }
    });

    it("maps each team to a unique asset (no accidental duplicates)", () => {
      const assets = EXPECTED_TEAM_NAMES.map((team) => teamCars[team]);
      expect(new Set(assets).size).toBe(assets.length);
    });

    it("uses the API-shaped keys with spaces (not slugged keys)", () => {
      // Guard against a regression where keys are normalised to e.g.
      // `redbull` or `red-bull` and stop matching API responses.
      expect(teamCars).toHaveProperty("Red Bull");
      expect(teamCars).toHaveProperty("Aston Martin");
      expect(teamCars).toHaveProperty("Alpine F1 Team");
      expect(teamCars).toHaveProperty("RB F1 Team");
      expect(teamCars).toHaveProperty("Haas F1 Team");
      expect(teamCars).not.toHaveProperty("redbull");
      expect(teamCars).not.toHaveProperty("red-bull");
    });
  });

  describe("isTeamName", () => {
    it.each(EXPECTED_TEAM_NAMES)("returns true for %s", (name) => {
      expect(isTeamName(name)).toBe(true);
    });

    it.each([
      "",
      "redbull",
      "Red bull",
      "RED BULL",
      "Renault",
      "Toro Rosso",
      "AlphaTauri",
      " Mercedes",
      "Mercedes ",
      "Unknown Team",
      "constructor",
      "toString",
      "hasOwnProperty",
    ])("returns false for unsupported name %j", (name) => {
      expect(isTeamName(name)).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(isTeamName("ferrari")).toBe(false);
      expect(isTeamName("FERRARI")).toBe(false);
      expect(isTeamName("Ferrari")).toBe(true);
    });
  });

  describe("getTeamCar", () => {
    it.each(EXPECTED_TEAM_NAMES)(
      "returns the same asset as the map for %s",
      (name) => {
        expect(getTeamCar(name)).toBe(teamCars[name]);
      }
    );

    it("returns undefined for unknown team names", () => {
      expect(getTeamCar("Renault")).toBeUndefined();
      expect(getTeamCar("AlphaTauri")).toBeUndefined();
      expect(getTeamCar("")).toBeUndefined();
    });

    it("returns undefined for case-mismatched names", () => {
      expect(getTeamCar("ferrari")).toBeUndefined();
      expect(getTeamCar("red bull")).toBeUndefined();
    });

    it("does not resolve inherited Object.prototype keys as teams", () => {
      // Without the `hasOwnProperty` guard, `"toString"` would be
      // considered a key because it exists on the prototype chain.
      expect(getTeamCar("toString")).toBeUndefined();
      expect(getTeamCar("hasOwnProperty")).toBeUndefined();
      expect(getTeamCar("constructor")).toBeUndefined();
    });
  });
});
