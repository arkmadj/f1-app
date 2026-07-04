import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import esCommon from "../locales/es/common.json";

export const fallbackLanguage = "en";
export const supportedLanguages = ["en", "es"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export const languageStorageKey = "f1-app-language";

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
} as const;

if (!i18n.isInitialized) {
  i18n.on("languageChanged", (language) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  });

  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: fallbackLanguage,
      supportedLngs: [...supportedLanguages],
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      defaultNS: "common",
      ns: ["common"],
      detection: {
        order: ["localStorage", "htmlTag", "navigator"],
        lookupLocalStorage: languageStorageKey,
        caches: ["localStorage"],
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.resolvedLanguage ?? fallbackLanguage;
}

export default i18n;
