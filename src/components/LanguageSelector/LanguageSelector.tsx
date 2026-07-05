import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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

const languages = supportedLanguages as readonly SupportedLanguage[];

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
  const listboxId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = toSupportedLanguage(
    i18n.resolvedLanguage ?? i18n.language
  );
  const [highlightedLanguage, setHighlightedLanguage] =
    useState<SupportedLanguage>(currentLanguage);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event: MouseEvent): void => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const openDropdown = useCallback((): void => {
    setHighlightedLanguage(currentLanguage);
    setIsOpen(true);
  }, [currentLanguage]);

  const moveHighlight = (direction: 1 | -1): void => {
    const currentIndex = languages.indexOf(highlightedLanguage);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      (safeIndex + direction + languages.length) % languages.length;
    setHighlightedLanguage(languages[nextIndex]);
  };

  const chooseLanguage = (language: SupportedLanguage): void => {
    setHighlightedLanguage(language);
    setIsOpen(false);
    void i18n.changeLanguage(language).then(() => {
      onLanguageChange?.(language);
    });
  };

  const handleButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>
  ): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }
        moveHighlight(-1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          chooseLanguage(highlightedLanguage);
          return;
        }
        openDropdown();
        break;
      case "Escape":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`group relative inline-flex min-w-48 items-center gap-3 rounded-full border border-(--background-color2) bg-(--background-buttons) px-2.5 py-2 text-sm text-(--text-color) shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-(--color3) hover:shadow-md ${isOpen ? "z-50" : ""} ${className}`}
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
        <button
          type="button"
          role="combobox"
          className="inline-flex min-w-29 cursor-pointer items-center justify-end gap-2 rounded-full border border-transparent bg-(--background-color) py-2 pl-4 pr-3 text-right font-['F1_Bold'] text-sm text-(--text-color) shadow-inner transition-colors duration-200 hover:border-(--color3) focus:outline-none focus-visible:border-(--color3) focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
          aria-label={t("language.selectAriaLabel")}
          aria-describedby={helperId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen
              ? `${listboxId}-option-${highlightedLanguage}`
              : undefined
          }
          onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
          onKeyDown={handleButtonKeyDown}
        >
          <span>{t(`language.${currentLanguage}`)}</span>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 text-(--color3) transition-transform duration-200 ${
              isOpen ? "rotate-180" : "group-hover:translate-y-0.5"
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("language.selectorLabel")}
            className="absolute right-0 top-full z-99999 mt-3 w-40 overflow-hidden rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-1.5 text-left shadow-xl shadow-black/10"
          >
            {languages.map((language) => {
              const isSelected = language === currentLanguage;
              const isHighlighted = language === highlightedLanguage;

              return (
                <li
                  key={language}
                  id={`${listboxId}-option-${language}`}
                  role="option"
                  aria-label={t(`language.${language}`)}
                  aria-selected={isSelected}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                    isHighlighted
                      ? "bg-(--color3) text-white"
                      : "text-(--text-color) hover:bg-(--background-color)"
                  }`}
                  onMouseEnter={() => setHighlightedLanguage(language)}
                  onClick={() => chooseLanguage(language)}
                >
                  <span className="font-['F1_Bold']">
                    {t(`language.${language}`)}
                  </span>
                  <span className="text-xs uppercase opacity-75">{language}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </span>
    </div>
  );
}

export default LanguageSelector;
