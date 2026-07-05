import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n, { languageStorageKey } from "../../app/i18n";
import LanguageSelector from "./LanguageSelector";

describe("LanguageSelector", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("renders a custom language combobox with the current language", () => {
    const { container } = render(<LanguageSelector />);

    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Interface text")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /select app language/i })
    ).toHaveTextContent("English");
    expect(container.querySelector("select")).not.toBeInTheDocument();
  });

  it("shows context for what the language control changes", () => {
    render(<LanguageSelector />);

    expect(
      screen.getByRole("combobox", { name: /select app language/i })
    ).toHaveAccessibleDescription(/interface text/i);
  });

  it("renders all configured language options when opened", () => {
    render(<LanguageSelector />);

    fireEvent.click(
      screen.getByRole("combobox", { name: /select app language/i })
    );

    expect(
      screen.getByRole("option", { name: "English" })
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("option", { name: "Spanish" })
    ).toHaveAttribute("aria-selected", "false");
  });

  it("changes and persists the selected language", async () => {
    render(<LanguageSelector />);

    fireEvent.click(
      screen.getByRole("combobox", { name: /select app language/i })
    );
    fireEvent.click(screen.getByRole("option", { name: "Spanish" }));

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("es"));
    expect(window.localStorage.getItem(languageStorageKey)).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(
      screen.getByRole("combobox", {
        name: /seleccionar idioma de la aplicación/i,
      })
    ).toHaveTextContent("Español");
  });

  it("notifies callers after a language is selected", async () => {
    const onLanguageChange = vi.fn();
    render(<LanguageSelector onLanguageChange={onLanguageChange} />);

    fireEvent.click(
      screen.getByRole("combobox", { name: /select app language/i })
    );
    fireEvent.click(screen.getByRole("option", { name: "Spanish" }));

    await waitFor(() => expect(onLanguageChange).toHaveBeenCalledWith("es"));
  });

  it("supports keyboard selection from the custom dropdown", async () => {
    const onLanguageChange = vi.fn();
    render(<LanguageSelector onLanguageChange={onLanguageChange} />);

    const combobox = screen.getByRole("combobox", {
      name: /select app language/i,
    });
    fireEvent.keyDown(combobox, { key: "ArrowDown" }); // open dropdown, highlight "en"
    fireEvent.keyDown(combobox, { key: "ArrowDown" }); // move highlight to "es"
    fireEvent.keyDown(combobox, { key: "Enter" });     // select "es"

    await waitFor(() => expect(onLanguageChange).toHaveBeenCalledTimes(1));
    expect(onLanguageChange).toHaveBeenCalledWith("es");
  });

  it("merges a custom className onto the wrapper", () => {
    const { container } = render(
      <LanguageSelector className="toolbar-language" />
    );

    expect(container.firstElementChild).toHaveClass("toolbar-language");
  });
});
