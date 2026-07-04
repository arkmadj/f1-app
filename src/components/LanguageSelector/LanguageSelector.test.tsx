import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n, { languageStorageKey } from "../../app/i18n";
import LanguageSelector from "./LanguageSelector";

describe("LanguageSelector", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("renders an accessible language combobox", () => {
    render(<LanguageSelector />);

    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Interface text")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /select app language/i })
    ).toHaveValue("en");
  });

  it("renders the configured language options", () => {
    render(<LanguageSelector />);

    expect(screen.getByRole("option", { name: "English" })).toHaveValue("en");
    expect(screen.getByRole("option", { name: "Spanish" })).toHaveValue("es");
  });

  it("changes and persists the selected language", async () => {
    render(<LanguageSelector />);

    fireEvent.change(
      screen.getByRole("combobox", { name: /select app language/i }),
      { target: { value: "es" } }
    );

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("es"));
    expect(window.localStorage.getItem(languageStorageKey)).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(
      screen.getByRole("combobox", {
        name: /seleccionar idioma de la aplicación/i,
      })
    ).toHaveValue("es");
    expect(screen.getByRole("option", { name: "Español" })).toHaveValue("es");
  });

  it("notifies callers after a language is selected", async () => {
    const onLanguageChange = vi.fn();
    render(<LanguageSelector onLanguageChange={onLanguageChange} />);

    fireEvent.change(
      screen.getByRole("combobox", { name: /select app language/i }),
      { target: { value: "es" } }
    );

    await waitFor(() => expect(onLanguageChange).toHaveBeenCalledWith("es"));
  });

  it("merges a custom className onto the wrapper", () => {
    const { container } = render(
      <LanguageSelector className="toolbar-language" />
    );

    expect(container.firstElementChild).toHaveClass("toolbar-language");
  });
});
