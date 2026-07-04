import { useEffect, useRef } from "react";
import type { DependencyList, RefObject } from "react";
import { animate, createScope, utils } from "animejs";

// ---------------------------------------------------------------------------
// useStaggerFadeIn
//
// Attaches a ref to a container element and, on mount (and whenever `deps`
// change), animates its descendants matching `selector` with a staggered
// fade-and-slide entrance powered by anime.js v4.
//
// The hook is a no-op when:
//   - the user has requested reduced motion via the OS-level setting, or
//   - no element matches `selector` inside the container.
//
// Animations are scoped via `createScope`, so unmounting (or a deps change)
// reverts inline styles cleanly and prevents stray timers from leaking.
// ---------------------------------------------------------------------------

interface UseStaggerFadeInOptions {
  /** CSS selector for the children to animate. Defaults to direct children. */
  selector?: string;
  /** Total duration of each child's animation in ms. */
  duration?: number;
  /** Delay between consecutive children in ms. */
  staggerMs?: number;
  /** Vertical offset (px) the children translate from at the start. */
  translateY?: number;
  /** Easing function name supported by anime.js v4 (e.g. "outQuad"). */
  ease?: string;
  /** Re-run the animation when any value in this list changes. */
  deps?: DependencyList;
}

const prefersReducedMotion = (): boolean => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export default function useStaggerFadeIn<
  T extends HTMLElement = HTMLDivElement,
>(options: UseStaggerFadeInOptions = {}): RefObject<T> {
  const ref = useRef<T>(null);
  const {
    selector = ":scope > *",
    duration = 600,
    staggerMs = 60,
    translateY = 16,
    ease = "outQuad",
    deps = [],
  } = options;

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return undefined;

    if (prefersReducedMotion()) {
      return undefined;
    }

    const scope = createScope({ root }).add(() => {
      animate(targets, {
        opacity: [0, 1],
        translateY: [translateY, 0],
        duration,
        delay: utils.stagger(staggerMs),
        ease,
      });
    });

    return () => {
      scope.revert();
    };
    // The caller owns the dependency list; intentionally spread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
