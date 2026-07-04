import { describe, expect, it } from "vitest";

import i18n, {
  fallbackLanguage,
  languageStorageKey,
  supportedLanguages,
} from "./i18n";

describe("i18n configuration", () => {
  it("registers the supported language bundles", () => {
    expect(i18n.languages).toContain(fallbackLanguage);
    expect(i18n.options.supportedLngs).toEqual(
      expect.arrayContaining([...supportedLanguages])
    );
    expect(i18n.hasResourceBundle("en", "common")).toBe(true);
    expect(i18n.hasResourceBundle("es", "common")).toBe(true);
  });

  it("persists language selection using the configured storage key", async () => {
    await i18n.changeLanguage("es");

    expect(i18n.t("language.es")).toBe("Español");
    expect(window.localStorage.getItem(languageStorageKey)).toBe("es");
  });
});