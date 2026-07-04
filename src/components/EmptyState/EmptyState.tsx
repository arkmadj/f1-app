import { useId } from "react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const rootClassName = [
  "EmptyState mx-auto my-6 flex max-w-3xl flex-col items-center justify-center overflow-hidden rounded-3xl",
  "border border-[rgba(196,32,33,0.18)] bg-(--navbar-background) px-[clamp(1.25rem,4vw,2.5rem)] py-[clamp(1.5rem,5vw,3rem)]",
  "text-center shadow-[0_18px_45px_rgba(0,0,0,0.08)]",
].join(" ");

const iconClassName = [
  "EmptyState__icon mb-5 flex h-16 w-16 items-center justify-center rounded-full",
  "border border-(--background-color2) bg-(--background-buttons) text-3xl",
  "shadow-[inset_0_0_0_6px_var(--background-color)]",
].join(" ");

function EmptyState({
  title,
  message,
  icon = "🏁",
  action,
  className = "",
}: EmptyStateProps): JSX.Element {
  const headingId = useId();
  const combinedClassName = [rootClassName, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={combinedClassName} aria-labelledby={headingId}>
      <div className={iconClassName} aria-hidden="true">
        {icon}
      </div>
      <h2
        id={headingId}
        className="mb-3 font-['F1_Bold'] text-[clamp(1.2rem,2vw,1.6rem)] leading-tight text-(--text-color)"
      >
        {title}
      </h2>
      {message && (
        <p className="max-w-xl text-sm leading-7 text-(--text-color2) sm:text-base">
          {message}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </section>
  );
}

export default EmptyState;
