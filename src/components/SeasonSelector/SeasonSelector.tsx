import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AVAILABLE_SEASONS, type Season } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";

interface SeasonSelectorProps {
  className?: string;
}

const seasons = AVAILABLE_SEASONS as readonly Season[];

const getSelectableSeason = (season: Season): Season =>
  seasons.includes(season) ? season : seasons[0];

function SeasonSelector({ className = "" }: SeasonSelectorProps): JSX.Element {
  const { selectedSeason, setSelectedSeason } = useSelectedSeason();
  const helperId = useId();
  const listboxId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedSeason, setHighlightedSeason] = useState<Season>(() =>
    getSelectableSeason(selectedSeason)
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event: MouseEvent): void => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const openDropdown = useCallback((): void => {
    setHighlightedSeason(getSelectableSeason(selectedSeason));
    setIsOpen(true);
  }, [selectedSeason]);

  const moveHighlight = (direction: 1 | -1): void => {
    const currentIndex = seasons.indexOf(highlightedSeason);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + direction + seasons.length) % seasons.length;
    setHighlightedSeason(seasons[nextIndex]);
  };

  const chooseSeason = (season: Season): void => {
    setSelectedSeason(season);
    setHighlightedSeason(season);
    setIsOpen(false);
  };

  const handleButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>
  ): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }
        moveHighlight(-1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          chooseSeason(highlightedSeason);
          return;
        }
        openDropdown();
        break;
      case "Escape":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`group relative inline-flex min-w-46 items-center gap-3 rounded-full border border-(--background-color2) bg-(--background-buttons) px-2.5 py-2 text-sm text-(--text-color) shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-(--color3) hover:shadow-md ${isOpen ? "z-50" : ""} ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(--color3)/15 text-(--color3) transition-colors duration-300 group-hover:bg-(--color3) group-hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 4v16M6 5h10l-1.5 3L16 11H6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-none">
        <span className="font-['F1_Bold'] text-[0.68rem] uppercase tracking-[0.22em] text-(--text-color2)">
          Season
        </span>
        <span id={helperId} className="mt-1 text-xs text-(--text-color3)">
          Championship year
        </span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <button
          type="button"
          role="combobox"
          className="inline-flex min-w-29 cursor-pointer items-center justify-end gap-2 rounded-full border border-transparent bg-(--background-color) py-2 pl-4 pr-3 text-right font-['F1_Bold'] text-sm text-(--text-color) shadow-inner transition-colors duration-200 hover:border-(--color3) focus:outline-none focus-visible:border-(--color3) focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
          aria-label="Select F1 season"
          aria-describedby={helperId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen ? `${listboxId}-option-${highlightedSeason}` : undefined
          }
          onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
          onKeyDown={handleButtonKeyDown}
        >
          <span>{selectedSeason}</span>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 text-(--color3) transition-transform duration-200 ${
              isOpen ? "rotate-180" : "group-hover:translate-y-0.5"
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
        {isOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Available F1 seasons"
            className="absolute right-0 top-full z-99999 mt-3 w-40 overflow-hidden rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-1.5 text-left shadow-xl shadow-black/10"
          >
            {seasons.map((season) => {
              const isSelected = season === selectedSeason;
              const isHighlighted = season === highlightedSeason;

              return (
                <li
                  key={season}
                  id={`${listboxId}-option-${season}`}
                  role="option"
                  aria-label={`${season} Season`}
                  aria-selected={isSelected}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                    isHighlighted
                      ? "bg-(--color3) text-white"
                      : "text-(--text-color) hover:bg-(--background-color)"
                  }`}
                  onMouseEnter={() => setHighlightedSeason(season)}
                  onClick={() => chooseSeason(season)}
                >
                  <span className="font-['F1_Bold']">{season}</span>
                  <span className="text-xs opacity-75">Season</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </span>
    </div>
  );
}

export default SeasonSelector;
