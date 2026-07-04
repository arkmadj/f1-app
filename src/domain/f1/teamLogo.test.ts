import { describe, expect, it } from "vitest";
import teamLogo, { getTeamLogo } from "./teamLogo";
import type { TeamName } from "./teamCars";

const EXPECTED_TEAM_NAMES: TeamName[] = [
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

describe("domain/f1/teamLogo", () => {
  it("exposes an entry for every supported team", () => {
    expect(Object.keys(teamLogo).sort()).toEqual(
      [...EXPECTED_TEAM_NAMES].sort()
    );
  });

  it.each(EXPECTED_TEAM_NAMES)("resolves the mapped logo for %s", (name) => {
    expect(getTeamLogo(name)).toBe(teamLogo[name]);
  });

  it.each(["", "Renault", "AlphaTauri", "ferrari", "Red bull"])(
    "returns undefined for unsupported team name %j",
    (name) => {
      expect(getTeamLogo(name)).toBeUndefined();
    }
  );
});
