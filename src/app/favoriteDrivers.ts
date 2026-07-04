export const favoriteDriversStorageKey = "f1-app-favorite-drivers";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const normalizeFavoriteDrivers = (value: unknown): string[] => {
  if (!isStringArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((driverId) => driverId.trim()).filter(Boolean))
  );
};

export const readFavoriteDrivers = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawFavoriteDrivers = window.localStorage.getItem(
      favoriteDriversStorageKey
    );

    return normalizeFavoriteDrivers(
      rawFavoriteDrivers ? JSON.parse(rawFavoriteDrivers) : undefined
    );
  } catch {
    return [];
  }
};

export const saveFavoriteDrivers = (driverIds: string[]): string[] => {
  const normalized = normalizeFavoriteDrivers(driverIds);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      favoriteDriversStorageKey,
      JSON.stringify(normalized)
    );
  }

  return normalized;
};
