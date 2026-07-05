import { useEffect, useRef, useState } from "react";

const SEASON_NOTICE =
  "Multi-season mode is available. Use the season selector to filter standings, schedules, and session results.";

function SeasonBanner(): JSX.Element | null {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const bannerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return undefined;

    const update = (): void => {
      document.documentElement.style.setProperty(
        "--banner-height",
        `${el.offsetHeight}px`
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--banner-height");
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      ref={bannerRef}
      className="sticky top-0 z-[1000] flex items-center justify-center gap-3 bg-(--color1) px-12 py-2.5 text-center text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] max-[600px]:px-10"
      role="status"
      aria-live="polite"
    >
      <p className="m-0 font-(--f1b) text-sm leading-[1.4] max-[600px]:text-xs">
        {SEASON_NOTICE}
      </p>
      <button
        type="button"
        className="absolute right-3.5 h-7 w-7 cursor-pointer rounded-full border border-transparent bg-transparent p-0 text-[1.3rem] leading-none text-inherit transition-colors duration-200 hover:border-white/65 hover:bg-white/18 focus-visible:border-white/65 focus-visible:bg-white/18 focus-visible:outline-none"
        aria-label="Dismiss season notice"
        onClick={() => setIsVisible(false)}
      >
        ×
      </button>
    </aside>
  );
}

export default SeasonBanner;
