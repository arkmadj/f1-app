export interface AppPreferences {
  reduceMotion: boolean;
  showSplashScreen: boolean;
}

export const appPreferencesStorageKey = "f1-app-two-preferences";

export const defaultAppPreferences: AppPreferences = {
  reduceMotion: false,
  showSplashScreen: true,
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeAppPreferences = (value: unknown): AppPreferences => {
  if (!isObject(value)) {
    return { ...defaultAppPreferences };
  }

  return {
    reduceMotion:
      typeof value.reduceMotion === "boolean"
        ? value.reduceMotion
        : defaultAppPreferences.reduceMotion,
    showSplashScreen:
      typeof value.showSplashScreen === "boolean"
        ? value.showSplashScreen
        : defaultAppPreferences.showSplashScreen,
  };
};

export const readAppPreferences = (): AppPreferences => {
  if (typeof window === "undefined") {
    return { ...defaultAppPreferences };
  }

  try {
    const rawPreferences = window.localStorage.getItem(
      appPreferencesStorageKey
    );
    return normalizeAppPreferences(
      rawPreferences ? JSON.parse(rawPreferences) : undefined
    );
  } catch {
    return { ...defaultAppPreferences };
  }
};

export const applyAppBehaviorPreferences = (
  preferences: AppPreferences
): void => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute(
    "data-reduced-motion",
    String(preferences.reduceMotion)
  );
};

export const saveAppPreferences = (
  preferences: AppPreferences
): AppPreferences => {
  const normalized = normalizeAppPreferences(preferences);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      appPreferencesStorageKey,
      JSON.stringify(normalized)
    );
  }

  applyAppBehaviorPreferences(normalized);
  return normalized;
};
