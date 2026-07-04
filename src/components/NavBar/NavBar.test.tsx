import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NavBar from "./NavBar";
import { renderWithRouter } from "../../test-utils/router";
import i18n, { languageStorageKey } from "../../app/i18n";

// jsdom does not implement matchMedia; install a default light-preference
// stub so `readInitialTheme` does not throw when no theme is persisted.
const installMatchMedia = (prefersDark: boolean): void => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark && query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const renderNavBar = async (initialPath: string = "/") =>
  renderWithRouter({
    initialPath,
    routes: [
      { path: "/", element: <NavBar /> },
      { path: "/driverstandings", element: <NavBar /> },
      { path: "/season-leaders", element: <NavBar /> },
      { path: "/driver-comparison", element: <NavBar /> },
      { path: "/constructorstandings", element: <NavBar /> },
      { path: "/constructor-comparison", element: <NavBar /> },
      { path: "/schedule", element: <NavBar /> },
      { path: "/qualifying", element: <NavBar /> },
      { path: "/race", element: <NavBar /> },
    ],
  });

describe("NavBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-reduced-motion");
    document.body.removeAttribute("data-theme");
    document.body.classList.remove("no-scroll");
    installMatchMedia(false);
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-reduced-motion");
    document.body.removeAttribute("data-theme");
    document.body.classList.remove("no-scroll");
  });

  describe("rendering", () => {
    it("renders the brand title and logo images", async () => {
      await renderNavBar();

      expect(screen.getByText("F1 APP TWO")).toBeInTheDocument();
      // One logo for the desktop bar and one for the mobile header.
      expect(screen.getAllByAltText("F1 APP TWO logo")).toHaveLength(2);
      expect(
        screen.getAllByRole("button", { name: "Open settings" })
      ).toHaveLength(2);
    });

    it("wires the desktop primary navigation to the expected routes", async () => {
      await renderNavBar();
      const desktopNav = screen.getByRole("navigation", { name: "Primary" });
      const standingsButton = within(desktopNav).getByRole("button", {
        name: "Standings",
      });
      const comparisonsButton = within(desktopNav).getByRole("button", {
        name: "Comparisons",
      });

      fireEvent.click(standingsButton);
      fireEvent.click(comparisonsButton);
      const standingsMenu = within(desktopNav).getByRole("menu", {
        name: "Standings submenu",
      });
      const comparisonsMenu = within(desktopNav).getByRole("menu", {
        name: "Comparisons submenu",
      });

      expect(
        within(desktopNav).getByRole("link", { name: /F1 APP TWO/i })
      ).toHaveAttribute("href", "/");
      expect(
        within(standingsMenu).getByRole("menuitem", {
          name: "Driver Standings",
        })
      ).toHaveAttribute("href", "/driverstandings");
      expect(
        within(standingsMenu).getByRole("menuitem", {
          name: "Constructor Standings",
        })
      ).toHaveAttribute("href", "/constructorstandings");
      expect(
        within(standingsMenu).getByRole("menuitem", {
          name: "Season Leaders",
        })
      ).toHaveAttribute("href", "/season-leaders");
      expect(standingsButton).toHaveAttribute("aria-expanded", "true");
      expect(comparisonsButton).toHaveAttribute("aria-expanded", "true");
      expect(
        within(comparisonsMenu).getByRole("menuitem", {
          name: "Compare Drivers",
        })
      ).toHaveAttribute("href", "/driver-comparison");
      expect(
        within(comparisonsMenu).getByRole("menuitem", {
          name: "Compare Constructors",
        })
      ).toHaveAttribute("href", "/constructor-comparison");
      expect(
        within(desktopNav).getByRole("link", { name: "Calendar" })
      ).toHaveAttribute("href", "/schedule");
      expect(
        within(desktopNav).getByRole("link", { name: "Qualifying" })
      ).toHaveAttribute("href", "/qualifying");
      expect(
        within(desktopNav).getByRole("link", { name: "Races" })
      ).toHaveAttribute("href", "/race");
    });

    it("wires the mobile navigation to the expected routes", async () => {
      await renderNavBar();
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const mobileNav = screen.getByRole("navigation", {
        name: "Mobile primary",
      });
      const standingsButton = within(mobileNav).getByRole("button", {
        name: "Standings",
      });
      const comparisonsButton = within(mobileNav).getByRole("button", {
        name: "Comparisons",
      });

      fireEvent.click(standingsButton);

      expect(
        within(mobileNav).getByRole("link", { name: "Home" })
      ).toHaveAttribute("href", "/");
      expect(standingsButton).toHaveAttribute("aria-expanded", "true");
      expect(
        within(mobileNav).getByRole("link", { name: "Driver Standings" })
      ).toHaveAttribute("href", "/driverstandings");
      expect(
        within(mobileNav).getByRole("link", { name: "Constructor Standings" })
      ).toHaveAttribute("href", "/constructorstandings");
      expect(
        within(mobileNav).getByRole("link", { name: "Season Leaders" })
      ).toHaveAttribute("href", "/season-leaders");

      fireEvent.click(comparisonsButton);

      expect(comparisonsButton).toHaveAttribute("aria-expanded", "true");
      expect(
        within(mobileNav).getByRole("link", { name: "Compare Drivers" })
      ).toHaveAttribute("href", "/driver-comparison");
      expect(
        within(mobileNav).getByRole("link", { name: "Compare Constructors" })
      ).toHaveAttribute("href", "/constructor-comparison");
      expect(
        within(mobileNav).getByRole("link", { name: "Calendar" })
      ).toHaveAttribute("href", "/schedule");
      expect(
        within(mobileNav).getByRole("link", { name: "Qualifying" })
      ).toHaveAttribute("href", "/qualifying");
      expect(
        within(mobileNav).getByRole("link", { name: "Race Results" })
      ).toHaveAttribute("href", "/race");
    });

    it("starts with the mobile menu collapsed", async () => {
      await renderNavBar();

      const toggle = screen.getByRole("button", { name: "Open menu" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveAttribute("aria-controls", "navbar-mobile-items");

      const mobileNav = screen.getByRole("navigation", {
        name: "Mobile primary",
      });
      expect(mobileNav).toHaveClass("nav_items");
      expect(mobileNav).not.toHaveClass("open");
      expect(document.body).not.toHaveClass("no-scroll");
    });
  });

  describe("mobile menu interactions", () => {
    it("opens and closes the menu when the toggle is clicked", async () => {
      await renderNavBar();

      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

      const opened = screen.getByRole("button", { name: "Close menu" });
      expect(opened).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByRole("navigation", { name: "Mobile primary" })
      ).toHaveClass("open");
      expect(document.body).toHaveClass("no-scroll");

      fireEvent.click(opened);

      expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
        "aria-expanded",
        "false"
      );
      expect(
        screen.getByRole("navigation", { name: "Mobile primary" })
      ).not.toHaveClass("open");
      expect(document.body).not.toHaveClass("no-scroll");
    });

    it.each([
      ["Enter", "Enter"],
      ["Space", " "],
    ])(
      "opens the menu when %s is pressed on the toggle",
      async (_label, key) => {
        await renderNavBar();
        const toggle = screen.getByRole("button", { name: "Open menu" });

        fireEvent.keyDown(toggle, { key });

        expect(
          screen.getByRole("button", { name: "Close menu" })
        ).toHaveAttribute("aria-expanded", "true");
        expect(document.body).toHaveClass("no-scroll");
      }
    );

    it("ignores other keys pressed on the toggle", async () => {
      await renderNavBar();
      const toggle = screen.getByRole("button", { name: "Open menu" });

      fireEvent.keyDown(toggle, { key: "a" });

      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(document.body).not.toHaveClass("no-scroll");
    });

    it("closes the menu when a mobile link is clicked", async () => {
      await renderNavBar();

      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const mobileNav = screen.getByRole("navigation", {
        name: "Mobile primary",
      });
      expect(mobileNav).toHaveClass("open");

      fireEvent.click(
        within(mobileNav).getByRole("button", { name: "Standings" })
      );

      fireEvent.click(
        within(mobileNav).getByRole("link", { name: "Driver Standings" })
      );

      expect(
        screen.getByRole("navigation", { name: "Mobile primary" })
      ).not.toHaveClass("open");
      expect(document.body).not.toHaveClass("no-scroll");
    });

    it("closes the menu when a comparison submenu link is clicked", async () => {
      await renderNavBar();

      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const mobileNav = screen.getByRole("navigation", {
        name: "Mobile primary",
      });

      fireEvent.click(
        within(mobileNav).getByRole("button", { name: "Comparisons" })
      );
      fireEvent.click(
        within(mobileNav).getByRole("link", { name: "Compare Drivers" })
      );

      expect(
        screen.getByRole("navigation", { name: "Mobile primary" })
      ).not.toHaveClass("open");
      expect(document.body).not.toHaveClass("no-scroll");
    });

    it("closes the menu when Escape is pressed", async () => {
      await renderNavBar();

      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      expect(
        screen.getByRole("navigation", { name: "Mobile primary" })
      ).toHaveClass("open");

      fireEvent.keyDown(window, { key: "Escape" });

      expect(
        screen.getByRole("navigation", { name: "Mobile primary" })
      ).not.toHaveClass("open");
      expect(document.body).not.toHaveClass("no-scroll");
    });

    it("releases the no-scroll lock when unmounted while open", async () => {
      const { unmount } = await renderNavBar();

      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      expect(document.body).toHaveClass("no-scroll");

      unmount();

      expect(document.body).not.toHaveClass("no-scroll");
    });
  });

  describe("desktop comparison submenu interactions", () => {
    it("stays open during a brief hover transition", async () => {
      vi.useFakeTimers();

      try {
        await renderNavBar();

        const desktopNav = screen.getByRole("navigation", { name: "Primary" });
        const comparisonsButton = within(desktopNav).getByRole("button", {
          name: "Comparisons",
        });
        const menuContainer = comparisonsButton.parentElement;

        expect(menuContainer).not.toBeNull();

        fireEvent.mouseEnter(menuContainer!);
        expect(comparisonsButton).toHaveAttribute("aria-expanded", "true");

        fireEvent.mouseLeave(menuContainer!);
        vi.advanceTimersByTime(60);

        fireEvent.mouseEnter(menuContainer!);
        vi.advanceTimersByTime(120);

        expect(comparisonsButton).toHaveAttribute("aria-expanded", "true");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("theme handling", () => {
    it("applies the persisted theme from localStorage on mount", async () => {
      window.localStorage.setItem("theme", "dark");

      await renderNavBar();

      expect(document.body.getAttribute("data-theme")).toBe("dark");

      const desktopNav = screen.getByRole("navigation", { name: "Primary" });
      fireEvent.click(
        within(desktopNav).getByRole("button", { name: "Open settings" })
      );

      expect(
        within(desktopNav).getByRole("switch", { name: /switch to light mode/i })
      ).toBeChecked();
    });

    it("falls back to the OS dark preference when nothing is persisted", async () => {
      installMatchMedia(true);

      await renderNavBar();

      expect(document.body.getAttribute("data-theme")).toBe("dark");
    });

    it("defaults to light when no preference and no system dark mode", async () => {
      await renderNavBar();

      expect(document.body.getAttribute("data-theme")).toBe("light");
      expect(window.localStorage.getItem("theme")).toBe("light");

      const desktopNav = screen.getByRole("navigation", { name: "Primary" });
      fireEvent.click(
        within(desktopNav).getByRole("button", { name: "Open settings" })
      );

      expect(
        within(desktopNav).getByRole("switch", { name: /switch to dark mode/i })
      ).not.toBeChecked();
    });

    it("toggles and persists the theme from the settings panel", async () => {
      await renderNavBar();
      expect(document.body.getAttribute("data-theme")).toBe("light");

      const desktopNav = screen.getByRole("navigation", { name: "Primary" });
      fireEvent.click(
        within(desktopNav).getByRole("button", { name: "Open settings" })
      );

      fireEvent.click(
        within(desktopNav).getByRole("switch", { name: /switch to dark mode/i })
      );

      expect(document.body.getAttribute("data-theme")).toBe("dark");
      expect(window.localStorage.getItem("theme")).toBe("dark");
      expect(
        within(desktopNav).getByRole("switch", { name: /switch to light mode/i })
      ).toBeChecked();

      fireEvent.click(
        within(desktopNav).getByRole("switch", { name: /switch to light mode/i })
      );

      expect(document.body.getAttribute("data-theme")).toBe("light");
      expect(window.localStorage.getItem("theme")).toBe("light");
    });
  });

  describe("language handling", () => {
    it("renders translated navigation labels after switching to Spanish", async () => {
      await i18n.changeLanguage("es");
      await renderNavBar();
      const desktopNav = screen.getByRole("navigation", { name: "Principal" });
      const standingsButton = within(desktopNav).getByRole("button", {
        name: "Clasificaciones",
      });
      const comparisonsButton = within(desktopNav).getByRole("button", {
        name: "Comparaciones",
      });

      fireEvent.click(standingsButton);
      fireEvent.click(comparisonsButton);

      expect(
        within(desktopNav).getByRole("menu", {
          name: "Submenú de Clasificaciones",
        })
      ).toBeInTheDocument();
      expect(
        within(desktopNav).getByRole("menuitem", {
          name: "Clasificación de pilotos",
        })
      ).toHaveAttribute("href", "/driverstandings");
      expect(
        within(desktopNav).getByRole("menuitem", {
          name: "Líderes de temporada",
        })
      ).toHaveAttribute("href", "/season-leaders");
      expect(
        within(desktopNav).getByRole("link", { name: "Calendario" })
      ).toHaveAttribute("href", "/schedule");

      fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
      const mobileNav = screen.getByRole("navigation", {
        name: "Navegación móvil principal",
      });

      expect(
        within(mobileNav).getByRole("link", { name: "Inicio" })
      ).toHaveAttribute("href", "/");
      expect(
        within(mobileNav).getByRole("link", { name: "Resultados de carrera" })
      ).toHaveAttribute("href", "/race");
    });

    it("removes duplicated selectors from the desktop and mobile navigation", async () => {
      await renderNavBar();
      const desktopNav = screen.getByRole("navigation", { name: "Primary" });

      expect(
        within(desktopNav).queryByRole("combobox", {
          name: /select app language/i,
        })
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const mobileNav = screen.getByRole("navigation", {
        name: "Mobile primary",
      });

      expect(
        within(mobileNav).queryByRole("combobox", {
          name: /select app language/i,
        })
      ).not.toBeInTheDocument();
    });

    it("changes and persists language from the desktop settings panel", async () => {
      await renderNavBar();
      const desktopNav = screen.getByRole("navigation", { name: "Primary" });

      fireEvent.click(
        within(desktopNav).getByRole("button", { name: "Open settings" })
      );

      fireEvent.change(
        within(desktopNav).getByRole("combobox", {
          name: /select app language/i,
        }),
        { target: { value: "es" } }
      );

      await waitFor(() => expect(i18n.resolvedLanguage).toBe("es"));
      expect(window.localStorage.getItem(languageStorageKey)).toBe("es");
      expect(document.documentElement.lang).toBe("es");
      expect(
        within(desktopNav).getByRole("combobox", {
          name: /seleccionar idioma de la aplicación/i,
        })
      ).toHaveValue("es");
    });
  });
});
