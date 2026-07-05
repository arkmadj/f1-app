import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import ExternalLink from "../ExternalLink/ExternalLink";
import ErgastApi from "../ErgestApi/ErgestApi";
import { seasonSearchParams, type Season } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";

interface FooterNavItem {
  to: string;
  labelKey: string;
  descriptionKey: string;
}

const FOOTER_LINKS: ReadonlyArray<FooterNavItem> = [
  {
    to: "/driverstandings",
    labelKey: "nav.items.driverStandings",
    descriptionKey: "footer.links.driverStandingsDescription",
  },
  {
    to: "/driver-comparison",
    labelKey: "nav.items.compareDrivers",
    descriptionKey: "footer.links.compareDriversDescription",
  },
  {
    to: "/constructorstandings",
    labelKey: "nav.items.constructorStandings",
    descriptionKey: "footer.links.constructorStandingsDescription",
  },
  {
    to: "/schedule",
    labelKey: "footer.links.scheduleLabel",
    descriptionKey: "footer.links.scheduleDescription",
  },
  {
    to: "/race",
    labelKey: "nav.items.raceResults",
    descriptionKey: "footer.links.raceResultsDescription",
  },
];

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3) " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)";

function FooterLink({
  to,
  labelKey,
  descriptionKey,
  season,
}: FooterNavItem & { season: Season }): JSX.Element {
  const { t } = useTranslation();

  return (
    <li>
      <Link
        to={to}
        search={seasonSearchParams(season)}
        className={[
          "group block rounded-2xl border border-(--background-color2)",
          "bg-(--background-buttons) px-4 py-3 text-left shadow-sm",
          "transition-all duration-300 ease-out hover:-translate-y-0.5",
          "hover:border-(--color3) hover:bg-(--background-buttons-hover)",
          FOCUS_RING,
        ].join(" ")}
      >
        <span className="block font-(--f1b) text-sm text-(--text-color) transition-colors duration-300 group-hover:text-(--color3)">
          {t(labelKey)}
        </span>
        <span className="mt-1 block text-xs leading-5 text-(--text-color3)">
          {t(descriptionKey)}
        </span>
      </Link>
    </li>
  );
}

function Footer(): JSX.Element {
  const year = new Date().getFullYear();
  const { selectedSeason } = useSelectedSeason();
  const { t } = useTranslation();

  return (
    <footer
      className="mt-14 w-full overflow-hidden border-t border-(--background-color2) bg-[radial-gradient(circle_at_top_left,rgba(196,32,33,0.14),transparent_34%),var(--background-color)] text-(--text-color) shadow-[0_-18px_50px_rgba(0,0,0,0.08)]"
      aria-labelledby="footer-title"
    >
      <div className="h-1.5 w-full bg-linear-to-r from-(--color1) via-(--color2) to-(--color3)" />

      <div className="mx-auto grid w-[min(100%-2rem,80rem)] gap-8 py-10 lg:grid-cols-[1.25fr_1fr_0.9fr]">
        <section
          className="max-w-xl text-center sm:text-left"
          aria-labelledby="footer-title"
        >
          <p className="mb-3 inline-flex rounded-full border border-(--background-color2) bg-(--background-buttons) px-3 py-1 text-[0.7rem] font-(--f1b) tracking-[0.18em] text-(--color1) uppercase">
            {t("nav.raceControl")}
          </p>
          <h2
            id="footer-title"
            className="font-(--f1b) text-[clamp(1.6rem,4vw,2.4rem)] leading-tight tracking-[-0.03em]"
          >
            {t("app.name")}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-(--text-color2)">
            {t("footer.tagline")}
          </p>
          <p className="mt-5 inline-flex rounded-full bg-(--background-buttons) px-4 py-2 text-xs leading-5 text-(--text-color3)">
            {t("footer.notAffiliated")}
          </p>
        </section>

        <nav aria-label={t("footer.quickLinksAriaLabel")}>
          <h3 className="mb-4 text-center font-(--f1b) text-sm tracking-[0.18em] text-(--text-color2) uppercase sm:text-left">
            {t("footer.exploreHeading")}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" role="list">
            {FOOTER_LINKS.map((link) => (
              <FooterLink key={link.to} {...link} season={selectedSeason} />
            ))}
          </ul>
        </nav>

        <section className="rounded-3xl border border-(--background-color2) bg-(--background-buttons) p-5 shadow-sm">
          <h3 className="font-(--f1b) text-sm tracking-[0.18em] text-(--text-color2) uppercase">
            {t("footer.dataTitle")}
          </h3>
          <p className="mt-3 text-sm leading-6 text-(--text-color3)">
            {t("footer.dataDescription")}
          </p>
          <div className="mt-5 flex flex-col items-stretch gap-3">
            <ErgastApi />
            <ExternalLink />
          </div>
        </section>
      </div>

      <div className="border-t border-(--background-color2) bg-(--background-buttons) px-5 py-4 text-center text-xs leading-5 text-(--text-color3)">
        <span className="font-(--f1b) text-(--text-color2)">
          {t("footer.copyright", { year })}
        </span>
        <span className="mx-2 hidden text-(--color3) sm:inline">•</span>
        <span className="block sm:inline">
          {t("footer.builtForBrowsing")}
        </span>
      </div>
    </footer>
  );
}

export default Footer;
