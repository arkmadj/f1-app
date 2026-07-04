export const favoriteConstructorsStorageKey =
  "f1-app-favorite-constructors";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const normalizeFavoriteConstructors = (value: unknown): string[] => {
  if (!isStringArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((constructorId) => constructorId.trim()).filter(Boolean))
  );
};

export const readFavoriteConstructors = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawFavoriteConstructors = window.localStorage.getItem(
      favoriteConstructorsStorageKey
    );

    return normalizeFavoriteConstructors(
      rawFavoriteConstructors ? JSON.parse(rawFavoriteConstructors) : undefined
    );
  } catch {
    return [];
  }
};

export const saveFavoriteConstructors = (constructorIds: string[]): string[] => {
  const normalized = normalizeFavoriteConstructors(constructorIds);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      favoriteConstructorsStorageKey,
      JSON.stringify(normalized)
    );
  }

  return normalized;
};