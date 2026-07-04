import { useEffect } from "react";

function getOrCreateFaviconLink(): HTMLLinkElement | null {
  if (typeof document === "undefined") return null;

  const existing = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = "icon";
  document.head.appendChild(link);
  return link;
}

export default function useFavicon(href: string | null | undefined): void {
  useEffect(() => {
    if (!href) return undefined;
    const link = getOrCreateFaviconLink();
    if (!link) return undefined;

    const previousHref = link.href;
    link.href = href;

    return () => {
      link.href = previousHref;
    };
  }, [href]);
}
