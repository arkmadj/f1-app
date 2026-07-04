import { useCallback, useEffect, useRef, useState } from "react";
import { createScope, createTimeline, svg, utils } from "animejs";
import logo from "../../assets/images/f1logo.png";
import { readAppPreferences } from "../../app/preferences";

// ---------------------------------------------------------------------------
// SplashScreen
//
// A full-screen, brand-led intro overlay played once when the app mounts.
// All choreography is owned by a single anime.js v4 timeline scoped to the
// component root, so unmounting cleanly reverts inline styles. Falls back to
// a brief, static reveal when the user prefers reduced motion.
// ---------------------------------------------------------------------------

interface SplashScreenProps {
  /** Invoked once the exit animation completes. */
  onComplete?: () => void;
}

const TITLE = "F1 APP ONE";
const streakClass =
  "splash-streak absolute left-0 h-0.5 w-[28%] -translate-x-[30%] bg-linear-to-r from-transparent via-white/85 to-transparent opacity-0 drop-shadow-[0_0_8px_rgba(228,56,73,0.7)] will-change-[transform,opacity] motion-reduce:translate-x-0 motion-reduce:opacity-100";

const prefersReducedMotion = (): boolean => {
  if (readAppPreferences().reduceMotion) {
    return true;
  }

  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

function SplashScreen({ onComplete }: SplashScreenProps): JSX.Element | null {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<boolean>(false);

  const finish = useCallback((): void => {
    setHidden(true);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    if (prefersReducedMotion()) {
      const id = window.setTimeout(finish, 700);
      return () => window.clearTimeout(id);
    }

    const scope = createScope({ root }).add(() => {
      const tl = createTimeline({
        defaults: { ease: "outExpo" },
        onComplete: finish,
      });

      const strokes = Array.from(
        root.querySelectorAll<SVGPathElement>(".splash-stroke")
      );
      if (strokes.length > 0) {
        tl.add(
          svg.createDrawable(strokes),
          {
            draw: ["0 0", "0 1"],
            duration: 900,
            delay: utils.stagger(90),
            ease: "inOutQuad",
          },
          0
        );
      }

      tl.add(
        ".splash-logo",
        { opacity: [0, 1], scale: [0.55, 1], rotate: [-12, 0], duration: 750 },
        220
      )
        .add(
          ".splash-letter",
          {
            opacity: [0, 1],
            translateY: [36, 0],
            duration: 600,
            delay: utils.stagger(55),
          },
          "-=420"
        )
        .add(
          ".splash-tagline",
          { opacity: [0, 1], translateY: [14, 0], duration: 500 },
          "-=260"
        )
        .add(
          ".splash-streak",
          {
            translateX: ["-30%", "130%"],
            opacity: [0, 1, 0],
            duration: 950,
            delay: utils.stagger(140),
            ease: "inOutQuart",
          },
          "-=900"
        )
        .add(
          ".splash-progress-fill",
          { scaleX: [0, 1], duration: 1100, ease: "inOutQuad" },
          "-=850"
        )
        .add(
          ".splash-overlay",
          { opacity: [1, 0], duration: 520, ease: "inOutQuad" },
          "+=180"
        );
    });

    return () => {
      scope.revert();
    };
  }, [finish]);

  if (hidden) return null;

  return (
    <div
      ref={rootRef}
      className="splash-overlay fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(228,56,73,0.18)_0%,rgba(15,15,17,0)_55%),linear-gradient(180deg,#15151a_0%,#0a0a0d_100%)] will-change-[opacity] before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.025)_0_2px,transparent_2px_6px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.025)_0_2px,transparent_2px_6px)] before:opacity-60 before:content-['']"
      role="status"
      aria-live="polite"
      aria-label="Loading F1 App One"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className={`${streakClass} top-[22%] w-[22%]`} />
        <span className={`${streakClass} top-[44%] h-[1.5px] w-[32%]`} />
        <span className={`${streakClass} top-[66%] w-[26%]`} />
        <span className={`${streakClass} top-[82%] h-[1.5px] w-[18%]`} />
      </div>

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="splash-stroke fill-none stroke-[rgba(228,56,73,0.55)] stroke-[1.5] drop-shadow-[0_0_6px_rgba(228,56,73,0.45)]"
          d="M0 60 L800 60"
        />
        <path
          className="splash-stroke fill-none stroke-[rgba(228,56,73,0.55)] stroke-[1.5] drop-shadow-[0_0_6px_rgba(228,56,73,0.45)]"
          d="M0 110 L800 110"
        />
        <path
          className="splash-stroke fill-none stroke-[rgba(228,56,73,0.55)] stroke-[1.5] drop-shadow-[0_0_6px_rgba(228,56,73,0.45)]"
          d="M0 160 L800 160"
        />
      </svg>

      <div className="relative z-[1] flex flex-col items-center px-6 text-center">
        <img
          className="splash-logo mb-7 h-auto w-[clamp(72px,14vw,132px)] opacity-0 drop-shadow-[0_8px_24px_rgba(228,56,73,0.45)] will-change-[transform,opacity] motion-reduce:opacity-100"
          src={logo}
          alt=""
        />
        <div
          className="flex gap-[clamp(2px,0.6vw,6px)] font-(--f1w,var(--f1b),system-ui,sans-serif) text-[clamp(2.2rem,6vw,4.4rem)] tracking-[clamp(2px,0.4vw,6px)] text-[#f5f5f7] shadow-none [text-shadow:0_4px_28px_rgba(228,56,73,0.45)]"
          aria-hidden="true"
        >
          {TITLE.split("").map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="splash-letter inline-block opacity-0 will-change-[transform,opacity] motion-reduce:opacity-100"
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </div>
        <p className="splash-tagline mt-[18px] font-(--f1r,system-ui,sans-serif) text-[clamp(0.9rem,1.4vw,1.05rem)] tracking-[3px] text-[#f5f5f7]/72 uppercase opacity-0 will-change-[transform,opacity] motion-reduce:opacity-100">
          Lights out and away we go
        </p>
        <div
          className="mt-9 h-[3px] w-[clamp(180px,28vw,320px)] overflow-hidden rounded-full bg-white/8"
          aria-hidden="true"
        >
          <span className="splash-progress-fill block h-full w-full origin-left scale-x-0 bg-linear-to-r from-[#c42021] via-[#ff5b5e] to-white will-change-transform motion-reduce:scale-x-100" />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
