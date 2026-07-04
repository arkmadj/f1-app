import { describe, expect, it } from "vitest";
import helmets, {
  getDriverHelmet,
  isDriverHelmetId,
  type DriverHelmetId,
} from "./helmets";

const EXPECTED_DRIVER_IDS: readonly DriverHelmetId[] = [
  "max_verstappen",
  "norris",
  "leclerc",
  "sainz",
  "perez",
  "piastri",
  "russell",
  "alonso",
  "tsunoda",
  "stroll",
  "ricciardo",
  "bearman",
  "hulkenberg",
  "gasly",
  "ocon",
  "albon",
  "kevin_magnussen",
  "zhou",
  "bottas",
  "sargeant",
  "hamilton",
];

describe("domain/f1/helmets", () => {
  it("exposes the expected driver helmet keys", () => {
    expect(Object.keys(helmets).sort()).toEqual(
      [...EXPECTED_DRIVER_IDS].sort()
    );
  });

  it.each(EXPECTED_DRIVER_IDS)(
    "returns the mapped helmet for %s",
    (driverId) => {
      expect(getDriverHelmet(driverId)).toBe(helmets[driverId]);
    }
  );

  it("keeps Bearman as an explicit missing-asset entry", () => {
    expect(isDriverHelmetId("bearman")).toBe(true);
    expect(getDriverHelmet("bearman")).toBe("");
  });

  it("returns undefined for unknown or missing driver ids", () => {
    expect(getDriverHelmet("unknown_driver")).toBeUndefined();
    expect(getDriverHelmet(null)).toBeUndefined();
    expect(getDriverHelmet(undefined)).toBeUndefined();
  });

  it("does not resolve inherited Object.prototype keys", () => {
    expect(isDriverHelmetId("constructor")).toBe(false);
    expect(getDriverHelmet("toString")).toBeUndefined();
    expect(getDriverHelmet("hasOwnProperty")).toBeUndefined();
  });

  it("exports an immutable helmet map", () => {
    expect(Object.isFrozen(helmets)).toBe(true);
    expect(() => {
      (helmets as Record<string, string>).hamilton = "changed";
    }).toThrow();
  });
});
