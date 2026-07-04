import type { CSSProperties } from "react";

interface LoaderProps {
  label?: string;
}

const FLAG_BACKGROUND_IMAGE = [
  "linear-gradient(45deg, #000 25%, transparent 25%)",
  "linear-gradient(-45deg, #000 25%, transparent 25%)",
  "linear-gradient(45deg, transparent 75%, #000 75%)",
  "linear-gradient(-45deg, transparent 75%, #000 75%)",
].join(", ");

const rootClassName = [
  "Loader mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-12",
  "text-[var(--text-color)]",
].join(" ");

const stageClassName = "Loader__stage relative h-[120px] w-[120px]";

const ringBaseClassName =
  "Loader__ring absolute inset-0 box-border rounded-full border-solid border-[var(--background-color2)]";

const dotClassName = [
  "Loader__dot inline-block motion-safe:animate-[loader-dot_1.4s_ease-in-out_infinite]",
  "motion-reduce:animate-none",
].join(" ");

const dots = ["0s", "0.2s", "0.4s"];

function Loader({ label = "Loading" }: LoaderProps): JSX.Element {
  return (
    <div
      className={rootClassName}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={stageClassName} aria-hidden="true">
        <div
          className={[
            ringBaseClassName,
            "Loader__ring--outer border-[6px] [border-top-color:var(--color1)] [border-right-color:#ff3a36]",
            "motion-safe:animate-[loader-spin_1.1s_cubic-bezier(0.65,0,0.35,1)_infinite]",
            "motion-reduce:animate-none [filter:drop-shadow(0_0_8px_rgb(225_6_0_/_0.35))]",
          ].join(" ")}
        />
        <div
          className={[
            ringBaseClassName,
            "Loader__ring--inner inset-[14px] border-[4px] [border-top-color:var(--a4)] [border-left-color:var(--a4)] opacity-90",
            "motion-safe:animate-[loader-spin-reverse_1.6s_cubic-bezier(0.65,0,0.35,1)_infinite]",
            "motion-reduce:animate-none",
          ].join(" ")}
        />
        <div
          className={[
            "Loader__hub absolute left-1/2 top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full",
            "bg-[var(--text-color)] [box-shadow:0_0_0_4px_var(--background-color2)]",
            "motion-safe:animate-[loader-pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
          ].join(" ")}
        />
        <div
          className={[
            "Loader__flag absolute bottom-[-18px] left-1/2 h-2 w-16 -translate-x-1/2 rounded-[2px] bg-white opacity-85",
            "[background-position:0_0,0_4px,4px_-4px,-4px_0] [background-size:8px_8px]",
            "motion-safe:animate-[loader-flag_1.2s_linear_infinite] motion-reduce:animate-none",
          ].join(" ")}
          style={
            { backgroundImage: FLAG_BACKGROUND_IMAGE } satisfies CSSProperties
          }
        />
      </div>
      <p
        className={[
          "Loader__label m-0 font-['F1_Bold'] text-[0.95rem] font-semibold uppercase tracking-[0.12em]",
          "text-[var(--text-color)] opacity-85 motion-safe:animate-[loader-fade_1.8s_ease-in-out_infinite]",
          "motion-reduce:animate-none motion-reduce:opacity-90",
        ].join(" ")}
      >
        {label}
        {dots.map((delay) => (
          <span
            key={delay}
            className={dotClassName}
            style={{ animationDelay: delay }}
          >
            .
          </span>
        ))}
      </p>
      <span className="Loader__sr-only sr-only">{label}…</span>
    </div>
  );
}

export default Loader;
