import { Link } from "@tanstack/react-router";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";

const QUICK_LINKS = [
  {
    to: "/",
    label: "Back to home",
    description: "Return to the starting grid.",
  },
  {
    to: "/driverstandings",
    label: "Driver standings",
    description: "See the selected season title fight.",
  },
  {
    to: "/constructorstandings",
    label: "Constructor standings",
    description: "Track each team's points.",
  },
  {
    to: "/race",
    label: "Race results",
    description: "Browse Grand Prix results.",
  },
] as const;

function NotFound(): JSX.Element {
  const { selectedSeason } = useSelectedSeason();

  return (
    <main
      className="grid min-h-[calc(100vh-220px)] place-items-center bg-[radial-gradient(circle_at_top_left,rgba(196,32,33,0.14),transparent_34%),var(--background-color)] px-5 py-16 max-[520px]:px-4 max-[520px]:py-10"
      aria-labelledby="not-found-title"
    >
      <section className="w-[min(100%,920px)] rounded-3xl border border-t-[6px] border-(--background-color2) border-t-(--color1) bg-(--background-buttons) p-[clamp(28px,5vw,56px)] text-center shadow-[0_24px_60px_rgba(0,0,0,0.14)]">
        <p className="mb-3.5 font-(--f1b) text-sm tracking-[0.18em] text-(--color1) uppercase">
          Yellow flag
        </p>
        <h1
          id="not-found-title"
          className="mx-auto mb-[18px] max-w-[760px] font-(--f1b) text-[clamp(2rem,6vw,4.5rem)] leading-[1.05]"
        >
          404 — This lap went off track
        </h1>
        <p className="mx-auto mb-[34px] max-w-[680px] text-[clamp(1rem,2vw,1.15rem)] leading-[1.7] text-(--text-color2)">
          The page you requested is not on the current F1 App Two circuit. Use
          one of these shortcuts to get back into the race.
        </p>

        <div
          className="grid grid-cols-4 gap-4 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1"
          aria-label="Helpful navigation links"
        >
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              search={seasonSearchParams(selectedSeason)}
              className="flex min-h-[120px] flex-col justify-center gap-2.5 rounded-[18px] border border-(--background-color2) bg-(--background-color) p-[18px] no-underline transition-all duration-250 hover:-translate-y-1 hover:border-(--color1) hover:shadow-[0_14px_30px_rgba(196,32,33,0.16)] focus-visible:-translate-y-1 focus-visible:border-(--color1) focus-visible:shadow-[0_14px_30px_rgba(196,32,33,0.16)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--color3)"
            >
              <span className="font-(--f1b) text-[0.98rem] text-(--text-color)">
                {link.label}
              </span>
              <small className="text-[0.8rem] leading-normal text-(--text-color2)">
                {link.description}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default NotFound;
