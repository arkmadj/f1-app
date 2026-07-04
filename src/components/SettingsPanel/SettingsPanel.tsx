import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  applyAppBehaviorPreferences,
  readAppPreferences,
  saveAppPreferences,
  type AppPreferences,
} from "../../app/preferences";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import SeasonSelector from "../SeasonSelector/SeasonSelector";
import ThemeSwitch from "../ThemeSwitch/ThemeSwitch";

export type ThemePreference = "light" | "dark";

interface SettingsPanelProps {
  className?: string;
  onBeforeOpen?: () => void;
  onThemeChange: (theme: ThemePreference) => void;
  theme: ThemePreference;
}

interface PreferenceToggleProps {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3) " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)";

function PreferenceToggle({
  checked,
  description,
  label,
  onChange,
}: PreferenceToggleProps): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-(--background-color2) bg-(--background-color) px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-['F1_Bold'] text-(--text-color)">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-(--text-color2)">
          {description}
        </span>
      </span>
      <input
        checked={checked}
        className={`h-5 w-5 shrink-0 cursor-pointer accent-(--color3) ${FOCUS_RING}`}
        onChange={(event) => onChange(event.target.checked)}
        role="switch"
        type="checkbox"
      />
    </label>
  );
}

function SettingsPanel({
  className = "",
  onBeforeOpen,
  onThemeChange,
  theme,
}: SettingsPanelProps): JSX.Element {
  const { t } = useTranslation();
  const panelId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [preferences, setPreferences] =
    useState<AppPreferences>(readAppPreferences);
  const isDarkMode = theme === "dark";

  useEffect(() => {
    applyAppBehaviorPreferences(preferences);
  }, [preferences]);

  const closePanel = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const openPanel = useCallback((): void => {
    onBeforeOpen?.();
    setPreferences(readAppPreferences());
    setIsOpen(true);
  }, [onBeforeOpen]);

  const togglePanel = useCallback((): void => {
    if (isOpen) {
      closePanel();
      return;
    }

    openPanel();
  }, [closePanel, isOpen, openPanel]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!panelRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closePanel, isOpen]);

  const updatePreferences = useCallback(
    (nextPreferences: AppPreferences): void => {
      setPreferences(saveAppPreferences(nextPreferences));
    },
    []
  );

  return (
    <div ref={panelRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          isOpen
            ? t("settings.closeButtonLabel")
            : t("settings.openButtonLabel")
        }
        className={`inline-flex h-11 items-center gap-2 rounded-full border border-(--background-color2) bg-(--background-buttons) px-3 text-sm font-['F1_Bold'] text-(--text-color) shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-(--color3) hover:text-(--color3) ${FOCUS_RING}`}
        onClick={togglePanel}
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92l-.03.08a2 2 0 0 1-3.74 0l-.03-.08a1.7 1.7 0 0 0-1-.92 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1l-.08-.03a2 2 0 0 1 0-3.74l.08-.03a1.7 1.7 0 0 0 .92-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92l.03-.08a2 2 0 0 1 3.74 0l.03.08a1.7 1.7 0 0 0 1 .92 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.06.4.36.78.92 1l.08.03a2 2 0 0 1 0 3.74l-.08.03a1.7 1.7 0 0 0-.92 1Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
        <span className="hidden xl:inline">{t("settings.buttonText")}</span>
      </button>

      {isOpen ? (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="absolute right-0 top-full z-700 mt-3 w-[min(calc(100vw-2rem),25rem)] rounded-3xl border border-(--background-color2) bg-(--background-color) p-4 text-(--text-color) shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color3)">
                {t("settings.eyebrow")}
              </p>
              <h2 id={titleId} className="mt-1 font-['F1_Bold'] text-xl">
                {t("settings.title")}
              </h2>
              <p
                id={descriptionId}
                className="mt-1 text-sm text-(--text-color2)"
              >
                {t("settings.description")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("settings.closeButtonLabel")}
              className={`rounded-full p-2 text-(--text-color2) transition-colors hover:bg-(--background-buttons) hover:text-(--color3) ${FOCUS_RING}`}
              onClick={closePanel}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <SeasonSelector className="w-full justify-between" />
            <LanguageSelector className="w-full justify-between" />

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-(--background-color2) bg-(--background-color) px-4 py-3">
              <span>
                <span className="block text-sm font-['F1_Bold']">
                  {t("settings.themeLabel")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-(--text-color2)">
                  {t("settings.themeDescription")}
                </span>
              </span>
              <ThemeSwitch
                checked={isDarkMode}
                onChange={(_, checked) =>
                  onThemeChange(checked ? "dark" : "light")
                }
              />
            </div>

            <PreferenceToggle
              checked={preferences.reduceMotion}
              description={t("settings.reduceMotionDescription")}
              label={t("settings.reduceMotionLabel")}
              onChange={(checked) =>
                updatePreferences({ ...preferences, reduceMotion: checked })
              }
            />
            <PreferenceToggle
              checked={preferences.showSplashScreen}
              description={t("settings.showSplashDescription")}
              label={t("settings.showSplashLabel")}
              onChange={(checked) =>
                updatePreferences({ ...preferences, showSplashScreen: checked })
              }
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default SettingsPanel;
