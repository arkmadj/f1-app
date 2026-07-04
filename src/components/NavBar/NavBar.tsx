import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import logo from "./../../assets/images/f1logo.png";
import SettingsPanel from "../SettingsPanel/SettingsPanel";
import useStaggerFadeIn from "../../hooks/useStaggerFadeIn";
import { seasonSearchParams, type Season } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

type Theme = "light" | "dark";

interface NavItem {
  to: string;
  labelKey: string;
}

const STANDINGS_LINKS: ReadonlyArray<NavItem> = [
  { to: "/driverstandings", labelKey: "nav.items.driverStandings" },
  { to: "/constructorstandings", labelKey: "nav.items.constructorStandings" },
  { to: "/season-leaders", labelKey: "nav.items.seasonLeaders" },
];

const DESKTOP_SECONDARY_LINKS: ReadonlyArray<NavItem> = [
  { to: "/schedule", labelKey: "nav.items.calendar" },
  { to: "/qualifying", labelKey: "nav.items.qualifying" },
  { to: "/race", labelKey: "nav.items.races" },
];

const MOBILE_PRIMARY_LINKS: ReadonlyArray<NavItem> = [
  { to: "/", labelKey: "nav.items.home" },
];

const MOBILE_SECONDARY_LINKS: ReadonlyArray<NavItem> = [
  { to: "/schedule", labelKey: "nav.items.calendar" },
  { to: "/qualifying", labelKey: "nav.items.qualifying" },
  { to: "/race", labelKey: "nav.items.raceResults" },
];

const COMPARISON_LINKS: ReadonlyArray<NavItem> = [
  { to: "/driver-comparison", labelKey: "nav.items.compareDrivers" },
  {
    to: "/constructor-comparison",
    labelKey: "nav.items.compareConstructors",
  },
];

const MOBILE_NAV_ID = "navbar-mobile-items";
const DESKTOP_STANDINGS_MENU_ID = "navbar-desktop-standings";
const MOBILE_STANDINGS_MENU_ID = "navbar-mobile-standings";
const DESKTOP_COMPARISON_MENU_ID = "navbar-desktop-comparisons";
const MOBILE_COMPARISON_MENU_ID = "navbar-mobile-comparisons";
const DESKTOP_MENU_CLOSE_DELAY_MS = 120;

// Shared focus ring used across interactive elements for keyboard a11y.
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color3)] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-color)] " +
  "rounded-sm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const readInitialTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const isMenuPath = (pathname: string, items: ReadonlyArray<NavItem>): boolean =>
  items.some((item) => item.to === pathname);

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/**
 * Desktop navigation link with an animated underline and an active-route
 * indicator. The link's inner span is what receives the underline so the
 * pseudo-element does not extend across the link's full hit area.
 */
function DesktopNavLink({
  to,
  label,
  season,
}: {
  to: string;
  label: string;
  season: Season;
}): JSX.Element {
  const baseClass = [
    "group inline-flex items-center px-1 py-1",
    "text-[15px] font-medium tracking-wide",
    "text-[var(--text-color)] transition-colors duration-300 ease-out",
    "hover:text-[var(--color3)]",
    FOCUS_RING,
  ].join(" ");

  return (
    <Link
      to={to}
      search={seasonSearchParams(season)}
      activeOptions={{ exact: to === "/" }}
      className={baseClass}
      activeProps={{ className: `${baseClass} text-[var(--color3)]` }}
    >
      {({ isActive }) => (
        <span
          className={[
            "relative inline-block",
            "after:content-[''] after:absolute after:left-0 after:-bottom-1",
            "after:h-[2px] after:w-full after:origin-left after:rounded-full",
            "after:bg-[var(--color3)] after:transition-transform",
            "after:duration-300 after:ease-out",
            isActive ? "after:scale-x-100" : "after:scale-x-0",
            "group-hover:after:scale-x-100",
          ].join(" ")}
        >
          {label}
        </span>
      )}
    </Link>
  );
}

function DesktopNavMenu({
  label,
  ariaLabel,
  items,
  getItemLabel,
  menuId,
  season,
}: {
  label: string;
  ariaLabel: string;
  items: ReadonlyArray<NavItem>;
  getItemLabel: (item: NavItem) => string;
  menuId: string;
  season: Season;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = items.some((item) => item.to === pathname);

  const clearCloseTimeout = useCallback((): void => {
    if (closeTimeoutRef.current === null) {
      return;
    }

    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  const closeMenu = useCallback((): void => {
    clearCloseTimeout();
    setIsOpen(false);
  }, [clearCloseTimeout]);

  const openMenu = useCallback((): void => {
    clearCloseTimeout();
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const scheduleCloseMenu = useCallback((): void => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsOpen(false);
    }, DESKTOP_MENU_CLOSE_DELAY_MS);
  }, [clearCloseTimeout]);

  useEffect(() => {
    const closeTimer = window.setTimeout(closeMenu, 0);
    return () => window.clearTimeout(closeTimer);
  }, [closeMenu, pathname]);

  useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeMenu, isOpen]);

  const buttonClass = [
    "group inline-flex items-center gap-2 px-1 py-1",
    "text-[15px] font-medium tracking-wide",
    "text-[var(--text-color)] transition-colors duration-300 ease-out",
    "hover:text-[var(--color3)]",
    isActive ? "text-[var(--color3)]" : "",
    FOCUS_RING,
  ].join(" ");

  const menuClass = [
    "absolute left-1/2 top-full z-20 mt-3 min-w-[16rem] -translate-x-1/2",
    "rounded-2xl border border-[var(--background-color2)] bg-[var(--background-color)]/98 p-2",
    "shadow-xl backdrop-blur-md transition-[opacity,transform,visibility] duration-200 ease-out",
    isOpen
      ? "visible translate-y-0 opacity-100"
      : "pointer-events-none invisible -translate-y-1 opacity-0",
  ].join(" ");

  const itemClass = [
    "block rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-color)]",
    "transition-colors duration-200 ease-out hover:bg-[var(--background-buttons)] hover:text-[var(--color3)]",
    FOCUS_RING,
  ].join(" ");

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleCloseMenu}
    >
      <button
        type="button"
        className={buttonClass}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => {
          clearCloseTimeout();
          setIsOpen((prev) => !prev);
        }}
      >
        <span
          className={[
            "relative inline-block",
            "after:content-[''] after:absolute after:left-0 after:-bottom-1",
            "after:h-[2px] after:w-full after:origin-left after:rounded-full",
            "after:bg-[var(--color3)] after:transition-transform",
            "after:duration-300 after:ease-out",
            isActive || isOpen ? "after:scale-x-100" : "after:scale-x-0",
            "group-hover:after:scale-x-100",
          ].join(" ")}
        >
          {label}
        </span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
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

      <div
        id={menuId}
        role="menu"
        aria-label={ariaLabel}
        aria-hidden={!isOpen}
        className={menuClass}
      >
        <ul role="list" className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                search={seasonSearchParams(season)}
                role="menuitem"
                tabIndex={isOpen ? 0 : -1}
                className={itemClass}
                activeProps={{
                  className: `${itemClass} bg-[var(--background-buttons)] text-[var(--color3)]`,
                }}
                onClick={closeMenu}
              >
                {getItemLabel(item)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Animated hamburger icon. Driven entirely by the `isOpen` prop so it stays
 * a pure presentational helper; the surrounding toggle owns interaction.
 */
function Hamburger({ isOpen }: { isOpen: boolean }): JSX.Element {
  const base =
    "block h-[3px] w-7 rounded-full bg-[var(--color1)] " +
    "transition-all duration-300 ease-out";
  return (
    <span aria-hidden="true" className="flex flex-col items-end gap-[6px]">
      <span
        className={[base, isOpen ? "translate-y-[9px] rotate-45" : ""].join(
          " "
        )}
      />
      <span
        className={[base, isOpen ? "opacity-0 scale-x-0" : "opacity-100"].join(
          " "
        )}
      />
      <span
        className={[base, isOpen ? "-translate-y-[9px] -rotate-45" : ""].join(
          " "
        )}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NavBar(): JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobileStandingsMenuOpen, setIsMobileStandingsMenuOpen] =
    useState<boolean>(false);
  const [isMobileComparisonMenuOpen, setIsMobileComparisonMenuOpen] =
    useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const { selectedSeason } = useSelectedSeason();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isStandingsRoute = isMenuPath(pathname, STANDINGS_LINKS);
  const isComparisonRoute = isMenuPath(pathname, COMPARISON_LINKS);
  const desktopNavRef = useStaggerFadeIn<HTMLElement>({
    selector: ".logo-link, .buttons > *",
    staggerMs: 70,
    duration: 500,
    translateY: -8,
  });

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  // Ensure the no-scroll lock applied when the mobile menu is open is always
  // released when the component unmounts (e.g. during route changes that swap
  // out the layout).
  useEffect(() => {
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, []);

  const setThemePreference = useCallback((nextTheme: Theme): void => {
    setTheme(nextTheme);
  }, []);

  const closeMenu = useCallback((): void => {
    setIsOpen(false);
    document.body.classList.remove("no-scroll");
  }, []);

  const toggleMenu = useCallback((): void => {
    setIsOpen((prev) => {
      const next = !prev;
      document.body.classList.toggle("no-scroll", next);
      return next;
    });
  }, []);

  const onToggleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMenu();
      }
    },
    [toggleMenu]
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (isStandingsRoute) {
      const openTimer = window.setTimeout(() => {
        setIsMobileStandingsMenuOpen(true);
        setIsMobileComparisonMenuOpen(false);
      }, 0);

      return () => window.clearTimeout(openTimer);
    }

    if (isComparisonRoute) {
      const openTimer = window.setTimeout(() => {
        setIsMobileComparisonMenuOpen(true);
        setIsMobileStandingsMenuOpen(false);
      }, 0);
      return () => window.clearTimeout(openTimer);
    }

    return undefined;
  }, [isComparisonRoute, isStandingsRoute]);

  const mobileBaseClass = [
    "group flex min-h-[56px] w-full items-center justify-between gap-4",
    "rounded-2xl border border-[var(--background-color2)] px-5 py-4 text-left",
    "font-['F1_Bold'] text-[clamp(1.1rem,5vw,1.6rem)] leading-tight tracking-[-0.02em]",
    "text-[var(--text-color)] shadow-sm touch-manipulation",
    "transition-[border-color,background-color,color,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
    "hover:-translate-y-0.5 hover:border-[var(--color3)] hover:bg-[var(--background-buttons-hover)] hover:text-[var(--color3)]",
    "active:translate-y-0 active:scale-[0.98]",
    isOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
    FOCUS_RING,
  ].join(" ");

  const getMobileItemStyle = (index: number): CSSProperties => ({
    transitionDelay: isOpen ? `${120 + index * 45}ms` : "0ms",
  });

  const getMobileSubmenuPanelClass = (isSubmenuOpen: boolean): string =>
    [
      "ml-4 overflow-hidden border-l border-[var(--background-color2)] pl-4",
      "transition-[max-height,opacity,transform,margin] duration-300 ease-out motion-reduce:transition-none",
      isSubmenuOpen && isOpen
        ? "mt-2 max-h-48 translate-y-0 opacity-100"
        : "mt-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none",
    ].join(" ");

  const mobileSubmenuLinkClass = [
    "group flex items-center justify-between gap-3 rounded-xl border border-[var(--background-color2)]",
    "bg-[var(--background-color)] px-4 py-3 text-sm font-['F1_Bold'] text-[var(--text-color)] shadow-sm",
    "transition-[border-color,background-color,color,transform] duration-300 ease-out",
    "hover:-translate-y-0.5 hover:border-[var(--color3)] hover:bg-[var(--background-buttons-hover)] hover:text-[var(--color3)]",
    FOCUS_RING,
  ].join(" ");

  const appName = t("app.name");
  const standingsLabel = t("nav.groups.standings");
  const comparisonsLabel = t("nav.groups.comparisons");
  const translateNavItem = (item: NavItem): string => t(item.labelKey);

  return (
    <header className="w-full sticky top-0 z-50 bg-[var(--background-color)] border-b border-[var(--background-color2)] shadow-sm">
      {/* Desktop navigation (>= lg) */}
      <nav
        className="hidden lg:flex items-center justify-between w-full px-6 xl:px-10 h-16"
        aria-label={t("nav.primaryAriaLabel")}
        ref={desktopNavRef}
      >
        <Link
          to="/"
          search={seasonSearchParams(selectedSeason)}
          className={`logo-link inline-flex items-center gap-3 py-2 ${FOCUS_RING}`}
          aria-label={t("nav.homeAriaLabel", { appName })}
        >
          <img
            className="h-8 w-auto transition-transform duration-300 ease-out hover:-translate-y-0.5"
            src={logo}
            alt={t("nav.logoAlt", { appName })}
          />
          <h1 className="font-['F1_Bold'] text-xl tracking-[0.08em] text-[var(--text-color)] leading-none">
            {appName}
          </h1>
        </Link>
        <div className="buttons flex items-center gap-6 xl:gap-10">
          <DesktopNavMenu
            label={standingsLabel}
            ariaLabel={t("nav.submenuAriaLabel", { label: standingsLabel })}
            items={STANDINGS_LINKS}
            getItemLabel={translateNavItem}
            menuId={DESKTOP_STANDINGS_MENU_ID}
            season={selectedSeason}
          />
          <DesktopNavMenu
            label={comparisonsLabel}
            ariaLabel={t("nav.submenuAriaLabel", { label: comparisonsLabel })}
            items={COMPARISON_LINKS}
            getItemLabel={translateNavItem}
            menuId={DESKTOP_COMPARISON_MENU_ID}
            season={selectedSeason}
          />
          {DESKTOP_SECONDARY_LINKS.map((link) => (
            <DesktopNavLink
              key={link.to}
              to={link.to}
              label={translateNavItem(link)}
              season={selectedSeason}
            />
          ))}
          <SettingsPanel theme={theme} onThemeChange={setThemePreference} />
        </div>
      </nav>

      {/* Mobile slide-in panel (< lg). The `nav_items` and `open` classes
          are preserved as test/aria hooks; visual styling is Tailwind. */}
      <nav
        id={MOBILE_NAV_ID}
        className={[
          "nav_items",
          "lg:hidden fixed left-0 top-16 z-[400] w-full",
          "h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain",
          "flex flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6",
          "bg-[var(--background-color)]/95 shadow-2xl backdrop-blur-xl",
          "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          isOpen
            ? "open translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0",
        ].join(" ")}
        aria-label={t("nav.mobilePrimaryAriaLabel")}
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5">
          <ul role="list" className="flex flex-col gap-3 py-1">
            {MOBILE_PRIMARY_LINKS.map((link, index) => {
              return (
                <li key={`${link.to}-${link.labelKey}`}>
                  <Link
                    to={link.to}
                    search={seasonSearchParams(selectedSeason)}
                    activeOptions={{ exact: link.to === "/" }}
                    onClick={closeMenu}
                    tabIndex={isOpen ? 0 : -1}
                    style={getMobileItemStyle(index)}
                    className={`${mobileBaseClass} bg-[var(--background-color)]`}
                    activeProps={{
                      className: `${mobileBaseClass} border-[var(--color3)] bg-[var(--background-buttons)] text-[var(--color3)]`,
                    }}
                  >
                    <span className="text-inherit">
                      {translateNavItem(link)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-lg text-[var(--color3)] transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}

            <li>
              <button
                type="button"
                aria-expanded={isMobileStandingsMenuOpen}
                aria-controls={MOBILE_STANDINGS_MENU_ID}
                onClick={() => {
                  setIsMobileStandingsMenuOpen((prev) => !prev);
                  setIsMobileComparisonMenuOpen(false);
                }}
                tabIndex={isOpen ? 0 : -1}
                style={getMobileItemStyle(MOBILE_PRIMARY_LINKS.length)}
                className={`${mobileBaseClass} ${
                  isStandingsRoute
                    ? "border-[var(--color3)] bg-[var(--background-buttons)] text-[var(--color3)]"
                    : "bg-[var(--background-color)]"
                }`}
              >
                <span className="text-inherit">{standingsLabel}</span>
                <svg
                  aria-hidden="true"
                  className={`h-5 w-5 text-[var(--color3)] transition-transform duration-200 ${
                    isMobileStandingsMenuOpen ? "rotate-180" : ""
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

              <div
                id={MOBILE_STANDINGS_MENU_ID}
                aria-hidden={!(isOpen && isMobileStandingsMenuOpen)}
                className={getMobileSubmenuPanelClass(
                  isMobileStandingsMenuOpen
                )}
              >
                <ul role="list" className="flex flex-col gap-2 pb-1">
                  {STANDINGS_LINKS.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        search={seasonSearchParams(selectedSeason)}
                        onClick={closeMenu}
                        tabIndex={isOpen && isMobileStandingsMenuOpen ? 0 : -1}
                        className={mobileSubmenuLinkClass}
                        activeProps={{
                          className: `${mobileSubmenuLinkClass} border-[var(--color3)] bg-[var(--background-buttons)] text-[var(--color3)]`,
                        }}
                      >
                        <span>{translateNavItem(link)}</span>
                        <span
                          aria-hidden="true"
                          className="text-base text-[var(--color3)] transition-transform duration-300 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            <li>
              <button
                type="button"
                aria-expanded={isMobileComparisonMenuOpen}
                aria-controls={MOBILE_COMPARISON_MENU_ID}
                onClick={() => {
                  setIsMobileComparisonMenuOpen((prev) => !prev);
                  setIsMobileStandingsMenuOpen(false);
                }}
                tabIndex={isOpen ? 0 : -1}
                style={getMobileItemStyle(MOBILE_PRIMARY_LINKS.length + 1)}
                className={`${mobileBaseClass} ${
                  isComparisonRoute
                    ? "border-[var(--color3)] bg-[var(--background-buttons)] text-[var(--color3)]"
                    : "bg-[var(--background-color)]"
                }`}
              >
                <span className="text-inherit">{comparisonsLabel}</span>
                <svg
                  aria-hidden="true"
                  className={`h-5 w-5 text-[var(--color3)] transition-transform duration-200 ${
                    isMobileComparisonMenuOpen ? "rotate-180" : ""
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

              <div
                id={MOBILE_COMPARISON_MENU_ID}
                aria-hidden={!(isOpen && isMobileComparisonMenuOpen)}
                className={getMobileSubmenuPanelClass(
                  isMobileComparisonMenuOpen
                )}
              >
                <ul role="list" className="flex flex-col gap-2 pb-1">
                  {COMPARISON_LINKS.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        search={seasonSearchParams(selectedSeason)}
                        onClick={closeMenu}
                        tabIndex={isOpen && isMobileComparisonMenuOpen ? 0 : -1}
                        className={mobileSubmenuLinkClass}
                        activeProps={{
                          className: `${mobileSubmenuLinkClass} border-[var(--color3)] bg-[var(--background-buttons)] text-[var(--color3)]`,
                        }}
                      >
                        <span>{translateNavItem(link)}</span>
                        <span
                          aria-hidden="true"
                          className="text-base text-[var(--color3)] transition-transform duration-300 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            {MOBILE_SECONDARY_LINKS.map((link, index) => {
              const transitionIndex = MOBILE_PRIMARY_LINKS.length + index + 2;

              return (
                <li key={`${link.to}-${link.labelKey}`}>
                  <Link
                    to={link.to}
                    search={seasonSearchParams(selectedSeason)}
                    activeOptions={{ exact: link.to === "/" }}
                    onClick={closeMenu}
                    tabIndex={isOpen ? 0 : -1}
                    style={getMobileItemStyle(transitionIndex)}
                    className={`${mobileBaseClass} bg-[var(--background-color)]`}
                    activeProps={{
                      className: `${mobileBaseClass} border-[var(--color3)] bg-[var(--background-buttons)] text-[var(--color3)]`,
                    }}
                  >
                    <span className="text-inherit">
                      {translateNavItem(link)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-lg text-[var(--color3)] transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-auto pb-2 pt-2 text-center text-xs text-[var(--text-color2)]">
            {t("nav.mobileHint")}
          </p>
        </div>
      </nav>

      {/* Mobile header bar (toggle + logo) */}
      <div className="lg:hidden flex flex-row-reverse items-center justify-between px-4 h-16">
        <div className="flex items-center gap-2">
          <SettingsPanel
            theme={theme}
            onThemeChange={setThemePreference}
            onBeforeOpen={closeMenu}
          />
          <button
            type="button"
            className={`inline-flex h-12 w-12 -mr-2 cursor-pointer touch-manipulation select-none items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--background-buttons)] active:scale-95 ${FOCUS_RING}`}
            onClick={toggleMenu}
            onKeyDown={onToggleKeyDown}
            aria-label={isOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isOpen}
            aria-controls={MOBILE_NAV_ID}
          >
            <Hamburger isOpen={isOpen} />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            search={seasonSearchParams(selectedSeason)}
            aria-label={t("nav.homeAriaLabel", { appName })}
            className={FOCUS_RING}
          >
            <img
              className={[
                "h-auto w-[88px] transition-opacity duration-300",
                isOpen ? "opacity-0 pointer-events-none" : "opacity-100",
              ].join(" ")}
              src={logo}
              alt={t("nav.logoAlt", { appName })}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default NavBar;
