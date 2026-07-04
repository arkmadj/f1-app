export const favoriteCircuitsStorageKey = "f1-app-favorite-circuits";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const normalizeFavoriteCircuits = (value: unknown): string[] => {
  if (!isStringArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((circuitId) => circuitId.trim()).filter(Boolean))
  );
};

export const readFavoriteCircuits = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawFavoriteCircuits = window.localStorage.getItem(
      favoriteCircuitsStorageKey
    );

    return normalizeFavoriteCircuits(
      rawFavoriteCircuits ? JSON.parse(rawFavoriteCircuits) : undefined
    );
  } catch {
    return [];
  }
};

export const saveFavoriteCircuits = (circuitIds: string[]): string[] => {
  const normalized = normalizeFavoriteCircuits(circuitIds);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      favoriteCircuitsStorageKey,
      JSON.stringify(normalized)
    );
  }

  return normalized;
};
