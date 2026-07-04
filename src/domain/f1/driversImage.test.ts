import { describe, expect, it } from "vitest";
import driversImage, {
  DEFAULT_DRIVER_IMAGE_VARIANT,
  getDriverImage,
  isDriverImageId,
  isDriverImageVariant,
} from "./driversImage";

describe("driversImage", () => {
  it("returns the default race image for a known driver id", () => {
    expect(getDriverImage("max_verstappen")).toBe(
      driversImage.max_verstappen[DEFAULT_DRIVER_IMAGE_VARIANT]
    );
  });

  it("returns a requested image variant for a known driver id", () => {
    expect(getDriverImage("max_verstappen", "profile")).toBe(
      driversImage.max_verstappen.profile
    );
  });

  it("narrows known driver ids", () => {
    expect(isDriverImageId("hamilton")).toBe(true);
  });

  it("narrows known image variants", () => {
    expect(isDriverImageVariant("profile")).toBe(true);
    expect(isDriverImageVariant("unknown")).toBe(false);
  });

  it("returns undefined for unknown or missing driver ids", () => {
    expect(getDriverImage("unknown_driver")).toBeUndefined();
    expect(getDriverImage(null)).toBeUndefined();
    expect(getDriverImage(undefined)).toBeUndefined();
  });

  it("exports an immutable image map", () => {
    expect(Object.isFrozen(driversImage)).toBe(true);
    expect(Object.isFrozen(driversImage.max_verstappen)).toBe(true);
  });
});
