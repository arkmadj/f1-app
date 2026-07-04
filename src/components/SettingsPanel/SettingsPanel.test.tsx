import { useState } from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "../../app/i18n";
import { appPreferencesStorageKey } from "../../app/preferences";
import { renderWithRouter } from "../../test-utils/router";
import SettingsPanel, { type ThemePreference } from "./SettingsPanel";

function SettingsPanelHarness(): JSX.Element {
  const [theme, setTheme] = useState<ThemePreference>("light");

  return <SettingsPanel theme={theme} onThemeChange={setTheme} />;
}

const renderSettingsPanel = async () =>
  renderWithRouter({
    routes: [{ path: "/", element: <SettingsPanelHarness /> }],
  });

const openSettingsDialog = async (): Promise<HTMLElement> => {
  await renderSettingsPanel();

  fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
  return screen.getByRole("dialog", { name: "Settings" });
};

const readStoredPreferences = () =>
  JSON.parse(window.localStorage.getItem(appPreferencesStorageKey) ?? "{}");

describe("SettingsPanel", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-reduced-motion");
    await i18n.changeLanguage("en");
  });

  it("opens an accessible settings dialog with preference controls", async () => {
    const dialog = await openSettingsDialog();

    expect(dialog).toHaveAccessibleDescription(/tune display/i);
    expect(
      within(dialog).getByRole("combobox", { name: /select f1 season/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("combobox", { name: /select app language/i })
    ).toHaveValue("en");
    expect(within(dialog).getByText("Color theme")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("switch", { name: /reduce motion/i })
    ).not.toBeChecked();
    expect(
      within(dialog).getByRole("switch", { name: /show splash screen/i })
    ).toBeChecked();
  });

  it("updates theme from the panel switch", async () => {
    const dialog = await openSettingsDialog();

    fireEvent.click(
      within(dialog).getByRole("switch", { name: /switch to dark mode/i })
    );

    await waitFor(() =>
      expect(
        within(dialog).getByRole("switch", { name: /switch to light mode/i })
      ).toBeChecked()
    );
  });

  it("persists behavior preferences and applies reduced motion immediately", async () => {
    const dialog = await openSettingsDialog();

    fireEvent.click(
      within(dialog).getByRole("switch", { name: /reduce motion/i })
    );

    expect(document.documentElement).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    expect(readStoredPreferences()).toMatchObject({ reduceMotion: true });

    fireEvent.click(
      within(dialog).getByRole("switch", { name: /show splash screen/i })
    );

    expect(readStoredPreferences()).toMatchObject({
      reduceMotion: true,
      showSplashScreen: false,
    });
  });

  it("closes when Escape is pressed", async () => {
    await openSettingsDialog();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Settings" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open settings" })
    ).toBeInTheDocument();
  });
});
