export interface DriverComparisonSearch {
  driver1?: string;
  driver2?: string;
}

const normalizeDriverId = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

export const validateDriverComparisonSearch = (
  search: Record<string, unknown>
): DriverComparisonSearch => ({
  driver1: normalizeDriverId(search.driver1),
  driver2: normalizeDriverId(search.driver2),
});

export const driverComparisonSearchParams = (
  driver1: string,
  driver2: string
): DriverComparisonSearch => ({
  driver1: normalizeDriverId(driver1),
  driver2: normalizeDriverId(driver2),
});
