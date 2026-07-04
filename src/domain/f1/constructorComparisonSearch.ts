export interface ConstructorComparisonSearch {
  constructor1?: string;
  constructor2?: string;
}

const normalizeConstructorId = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

export const validateConstructorComparisonSearch = (
  search: Record<string, unknown>
): ConstructorComparisonSearch => ({
  constructor1: normalizeConstructorId(search.constructor1),
  constructor2: normalizeConstructorId(search.constructor2),
});

export const constructorComparisonSearchParams = (
  constructor1: string,
  constructor2: string
): ConstructorComparisonSearch => ({
  constructor1: normalizeConstructorId(constructor1),
  constructor2: normalizeConstructorId(constructor2),
});
