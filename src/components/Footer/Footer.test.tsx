import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Footer from "./Footer";
import { renderWithRouter } from "../../test-utils/router";
import i18n from "../../app/i18n";

const renderFooter = async (initialPath = "/?season=2026") =>
  renderWithRouter({
    initialPath,
    routes: [
      { path: "/", element: <Footer /> },
      { path: "/driverstandings", element: <Footer /> },
      { path: "/driver-comparison", element: <Footer /> },
      { path: "/constructorstandings", element: <Footer /> },
      { path: "/schedule", element: <Footer /> },
      { path: "/race", element: <Footer /> },
    ],
  });

describe("Footer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the enhanced brand, attribution, and source links", async () => {
    await renderFooter();
    const footer = screen.getByRole("contentinfo");

    expect(
      within(footer).getByRole("heading", { name: "F1 APP TWO" })
    ).toBeInTheDocument();
    expect(within(footer).getByText(/race control/i)).toBeInTheDocument();
    expect(within(footer).getByText(/not affiliated/i)).toBeInTheDocument();
    expect(within(footer).getByText(/© 2026 F1 App/i)).toBeInTheDocument();
    expect(
      within(footer).getByRole("link", { name: /jolpica f1 api/i })
    ).toHaveAttribute("href", "https://github.com/jolpica/jolpica-f1");
    expect(
      within(footer).getByRole("link", { name: /view source on github/i })
    ).toHaveAttribute("href", "https://github.com/arkmadj/f1-app");
  });

  it("preserves the selected season in footer quick links", async () => {
    await renderFooter();
    const quickLinks = screen.getByRole("navigation", {
      name: "Footer quick links",
    });

    expect(
      within(quickLinks).getByRole("link", { name: /driver standings/i })
    ).toHaveAttribute("href", "/driverstandings?season=2026");
    expect(
      within(quickLinks).getByRole("link", { name: /constructor standings/i })
    ).toHaveAttribute("href", "/constructorstandings?season=2026");
    expect(
      within(quickLinks).getByRole("link", { name: /schedule/i })
    ).toHaveAttribute("href", "/schedule?season=2026");
    expect(
      within(quickLinks).getByRole("link", { name: /race results/i })
    ).toHaveAttribute("href", "/race?season=2026");
  });

  it("renders localized Spanish footer copy", async () => {
    await i18n.changeLanguage("es");
    await renderFooter();
    const footer = screen.getByRole("contentinfo");

    expect(within(footer).getByText(/control de carrera/i)).toBeInTheDocument();
    expect(
      within(footer).getByText(/no afiliado a formula 1/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: "Enlaces rápidos del pie de página",
      })
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("link", { name: /clasificación de pilotos/i })
    ).toHaveAttribute("href", "/driverstandings?season=2026");
    expect(
      within(footer).getByRole("link", { name: /ver código fuente en github/i })
    ).toHaveAttribute("href", "https://github.com/arkmadj/f1-app");
  });
});
