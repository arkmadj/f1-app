import { useId } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  fallbackLanguage,
  supportedLanguages,
  type SupportedLanguage,
} from "../../app/i18n";

interface LanguageSelectorProps {
  className?: string;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

const languages = supportedLanguages;

const isSupportedLanguage = (language: string): language is SupportedLanguage =>
  (supportedLanguages as readonly string[]).includes(language);

const toSupportedLanguage = (language?: string): SupportedLanguage => {
  const baseLanguage = language?.split("-")[0] ?? fallbackLanguage;
  return isSupportedLanguage(baseLanguage) ? baseLanguage : fallbackLanguage;
};

function LanguageSelector({
  className = "",
  onLanguageChange,
}: LanguageSelectorProps): JSX.Element {
  const { i18n, t } = useTranslation();
  const helperId = useId();
  const currentLanguage = toSupportedLanguage(
    i18n.resolvedLanguage ?? i18n.language
  );

  const handleLanguageChange = (
    event: ChangeEvent<HTMLSelectElement>
  ): void => {
    const nextLanguage = toSupportedLanguage(event.target.value);
    void i18n.changeLanguage(nextLanguage).then(() => {
      onLanguageChange?.(nextLanguage);
    });
  };

  return (
    <label
      className={`group relative inline-flex min-w-48 items-center gap-3 rounded-full border border-(--background-color2) bg-(--background-buttons) px-2.5 py-2 text-sm text-(--text-color) shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-(--color3) hover:shadow-md ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(--color3)/15 text-(--color3) transition-colors duration-300 group-hover:bg-(--color3) group-hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21a9 9 0 1 0 0-18m0 18a9 9 0 1 1 0-18m0 18c2-2.2 3.2-5.2 3.2-9S14 5.2 12 3m0 18c-2-2.2-3.2-5.2-3.2-9S10 5.2 12 3M3.6 9h16.8M3.6 15h16.8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-none">
        <span className="font-['F1_Bold'] text-[0.68rem] uppercase tracking-[0.22em] text-(--text-color2)">
          {t("language.selectorLabel")}
        </span>
        <span id={helperId} className="mt-1 text-xs text-(--text-color3)">
          {t("language.selectorDescription")}
        </span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <select
          value={currentLanguage}
          onChange={handleLanguageChange}
          aria-label={t("language.selectAriaLabel")}
          aria-describedby={helperId}
          className="min-w-28 cursor-pointer appearance-none rounded-full border border-transparent bg-(--background-color) py-2 pl-4 pr-9 text-right font-['F1_Bold'] text-sm text-(--text-color) shadow-inner transition-colors duration-200 hover:border-(--color3) focus:outline-none focus-visible:border-(--color3) focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
        >
          {languages.map((language) => (
            <option key={language} value={language}>
              {t(`language.${language}`)}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 h-4 w-4 text-(--color3) transition-transform duration-200 group-hover:translate-y-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </label>
  );
}

export default LanguageSelector;
