import {
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from "react";
import {
  getCircuitLayout,
  getCircuitVectorAsset,
  type CircuitLayout,
} from "../../domain/f1/circuitLayouts";

type CircuitMapProps = {
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
  mapUrl: string;
  latitude?: string;
  longitude?: string;
};

type PanOffset = {
  x: number;
  y: number;
};

type DragState = PanOffset & {
  pointerId: number;
  originX: number;
  originY: number;
};

type CornerMarker = {
  label: string;
  title: string;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
};

type InteractiveHotspot = {
  id: string;
  kind: "sector" | "corner";
  title: string;
  badgeLabel: string;
  eyebrow: string;
  meta: string;
  summary: string;
  accentColor: string;
  x: number;
  y: number;
  anchorX?: number;
  anchorY?: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const clampZoom = (value: number): number => clamp(value, MIN_ZOOM, MAX_ZOOM);

const getPanLimit = (zoom: number): number => (zoom - MIN_ZOOM) * 140;

const clampPanOffset = (offset: PanOffset, zoom: number): PanOffset => {
  if (zoom <= MIN_ZOOM) return { x: 0, y: 0 };

  const limit = getPanLimit(zoom);
  return {
    x: clamp(offset.x, -limit, limit),
    y: clamp(offset.y, -limit, limit),
  };
};

const FALLBACK_LAYOUT: CircuitLayout = {
  title: "Circuit layout pending",
  viewBox: "0 0 420 280",
  path: "M78 206 C115 148 168 111 227 98 C278 87 337 111 354 157 C373 207 325 242 266 220 C232 207 191 205 154 220 C114 237 58 238 78 206 Z",
  direction: "Clockwise",
  lengthKm: "TBC",
  turns: 0,
  longestStraight: "TBC",
  markers: [
    { label: "Pinned circuit location", x: 210, y: 140, type: "start" },
    { label: "Exact layout data pending", x: 295, y: 112, type: "sector" },
  ],
};

const markerFill = (type: CircuitLayout["markers"][number]["type"]): string => {
  switch (type) {
    case "start":
      return "var(--color1)";
    case "speed":
      return "#facc15";
    case "sector":
      return "var(--color3)";
  }
};

const markerShortLabel = (label: string, index: number): string => {
  if (label.toLowerCase().includes("start")) return "S/F";
  if (label.toLowerCase().includes("pending")) return "?";
  return `S${index}`;
};

const getSectorBadgeLabel = (label: string, index: number): string => {
  const sectorMatch = label.match(/sector\s+([0-9]+)/i);
  if (sectorMatch?.[1]) return `S${sectorMatch[1]}`;
  return markerShortLabel(label, index + 1);
};

const getViewBoxMetrics = (
  viewBox: string
): { minX: number; minY: number; width: number; height: number } => {
  const [minX = 0, minY = 0, width = 420, height = 280] = viewBox
    .trim()
    .split(/\s+/)
    .map(Number);

  return { minX, minY, width, height };
};

const getLayoutAspectRatio = (viewBox: string): string => {
  const { width, height } = getViewBoxMetrics(viewBox);
  return `${width} / ${height}`;
};

const buildCornerMarkers = (layout: CircuitLayout): CornerMarker[] => {
  if (layout.turns <= 0) return [];

  const { minX, minY, width, height } = getViewBoxMetrics(layout.viewBox);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const badgeOffsetX = width * 0.06;
  const badgeOffsetY = height * 0.065;
  const badgePadding = 18;
  const referenceMarkers = layout.markers.filter(
    (marker) => marker.type !== "start"
  );
  if (referenceMarkers.length === 0) return [];

  const turnNumbers = [1, Math.ceil(layout.turns / 2), layout.turns];
  const referenceIndexes = [
    0,
    Math.floor((referenceMarkers.length - 1) / 2),
    referenceMarkers.length - 1,
  ];
  const usedTurns = new Set<number>();

  return turnNumbers.reduce<CornerMarker[]>((markers, turn, index) => {
    const referenceMarker = referenceMarkers[referenceIndexes[index]];
    if (!referenceMarker || usedTurns.has(turn)) return markers;

    usedTurns.add(turn);
    markers.push({
      label: `T${turn}`,
      title: `Turn ${turn} reference near ${referenceMarker.label}`,
      anchorX: referenceMarker.x,
      anchorY: referenceMarker.y,
      x: clamp(
        referenceMarker.x +
          (referenceMarker.x < centerX ? -badgeOffsetX : badgeOffsetX),
        minX + badgePadding,
        minX + width - badgePadding
      ),
      y: clamp(
        referenceMarker.y +
          (referenceMarker.y < centerY ? -badgeOffsetY : badgeOffsetY),
        minY + badgePadding,
        minY + height - badgePadding
      ),
    });
    return markers;
  }, []);
};

const safeId = (value: string): string => value.replace(/[^a-z0-9_-]/gi, "-");

const buildSectorHotspots = (layout: CircuitLayout): InteractiveHotspot[] =>
  layout.markers
    .filter((marker) => marker.type !== "start")
    .map((marker, index) => ({
      id: `sector-${safeId(marker.label)}`,
      kind: "sector",
      title: marker.label,
      badgeLabel: getSectorBadgeLabel(marker.label, index),
      eyebrow: marker.type === "speed" ? "High-speed sector" : "Sector reference",
      meta: `${layout.direction} · ${layout.lengthKm} lap`,
      summary:
        marker.type === "speed"
          ? `Highlights one of the quickest sequences on the lap near ${layout.longestStraight}.`
          : `Reference point for this sector on the ${layout.turns}-turn layout.`,
      accentColor: markerFill(marker.type),
      x: marker.x,
      y: marker.y,
    }));

const buildCornerHotspots = (
  layout: CircuitLayout,
  cornerMarkers: readonly CornerMarker[]
): InteractiveHotspot[] =>
  cornerMarkers.map((corner) => {
    const turnNumber = Number(corner.label.replace(/[^0-9]/g, ""));

    return {
      id: `corner-${safeId(corner.label)}`,
      kind: "corner",
      title: corner.label,
      badgeLabel: corner.label,
      eyebrow: "Corner reference",
      meta: `Turn ${turnNumber} of ${layout.turns} · ${layout.direction}`,
      summary: corner.title,
      accentColor: "var(--color2)",
      x: corner.x,
      y: corner.y,
      anchorX: corner.anchorX,
      anchorY: corner.anchorY,
    };
  });

type TrackMapHotspotsOverlayProps = {
  viewBox: string;
  hotspots: readonly InteractiveHotspot[];
  activeHotspotId: string | null;
  onActivate: (hotspot: InteractiveHotspot) => void;
  onDeactivate: (hotspotId: string) => void;
};

function TrackMapHotspotsOverlay({
  viewBox,
  hotspots,
  activeHotspotId,
  onActivate,
  onDeactivate,
}: TrackMapHotspotsOverlayProps): JSX.Element | null {
  if (hotspots.length === 0) return null;

  const handleKeyDown = (
    event: ReactKeyboardEvent<SVGCircleElement>,
    hotspot: InteractiveHotspot
  ): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate(hotspot);
    }

    if (event.key === "Escape") {
      onDeactivate(hotspot.id);
    }
  };

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full overflow-visible"
    >
      {hotspots.map((hotspot) => {
        const isActive = hotspot.id === activeHotspotId;
        const isCorner = hotspot.kind === "corner";

        return (
          <g key={hotspot.id}>
            {isCorner && hotspot.anchorX !== undefined && hotspot.anchorY !== undefined ? (
              <>
                <line
                  x1={hotspot.anchorX}
                  y1={hotspot.anchorY}
                  x2={hotspot.x}
                  y2={hotspot.y}
                  stroke={isActive ? "var(--color1)" : hotspot.accentColor}
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeWidth={isActive ? "2.75" : "2"}
                />
                <circle
                  cx={hotspot.anchorX}
                  cy={hotspot.anchorY}
                  fill={isActive ? "var(--color1)" : hotspot.accentColor}
                  r={isActive ? "4.5" : "3.5"}
                  stroke="var(--background-color)"
                  strokeWidth="1.5"
                />
              </>
            ) : null}

            <circle
              cx={hotspot.x}
              cy={hotspot.y}
              fill={hotspot.accentColor}
              fillOpacity={isCorner ? 0.18 : 0.22}
              r={isCorner ? (isActive ? "16" : "14") : isActive ? "18" : "16"}
              stroke={isActive ? "var(--color1)" : hotspot.accentColor}
              strokeOpacity={isActive ? 1 : 0.55}
              strokeWidth={isActive ? "3.5" : "2.5"}
            />
            <circle
              cx={hotspot.x}
              cy={hotspot.y}
              fill={isCorner ? "var(--background-buttons)" : hotspot.accentColor}
              r={isCorner ? "10" : "12"}
              stroke={isActive ? "var(--color1)" : "var(--background-color)"}
              strokeWidth={isActive ? "4" : "3"}
            />
            <text
              x={hotspot.x}
              y={hotspot.y + (isCorner ? 3 : 4)}
              fill={isCorner ? "var(--text-color)" : "#ffffff"}
              fontSize={isCorner ? "8" : "9"}
              fontWeight="800"
              textAnchor="middle"
            >
              {hotspot.badgeLabel}
            </text>
            <circle
              cx={hotspot.x}
              cy={hotspot.y}
              r={isCorner ? "22" : "24"}
              fill="transparent"
              pointerEvents="all"
              role="button"
              tabIndex={0}
              aria-label={`${hotspot.title}. ${hotspot.summary}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => onActivate(hotspot)}
              onMouseLeave={() => onDeactivate(hotspot.id)}
              onFocus={() => onActivate(hotspot)}
              onBlur={() => onDeactivate(hotspot.id)}
              onClick={() => onActivate(hotspot)}
              onKeyDown={(event) => handleKeyDown(event, hotspot)}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </g>
        );
      })}
    </svg>
  );
}

function CircuitMap({
  circuitId,
  circuitName,
  locality,
  country,
  mapUrl,
  latitude,
  longitude,
}: CircuitMapProps): JSX.Element {
  const exactLayout = getCircuitLayout(circuitId);
  const vectorAsset = getCircuitVectorAsset(circuitId);
  const layout = exactLayout ?? FALLBACK_LAYOUT;
  const hasExactLayout = Boolean(exactLayout);
  const [failedVectorUrl, setFailedVectorUrl] = useState<string | null>(null);
  const idSuffix = safeId(circuitId || circuitName);
  const gradientId = `circuit-gradient-${idSuffix}`;
  const gridId = `circuit-grid-${idSuffix}`;
  const shouldUseAccurateVector =
    Boolean(vectorAsset) && failedVectorUrl !== vectorAsset?.url;
  const ariaLabel = hasExactLayout
    ? `${circuitName} track layout map`
    : `${circuitName} circuit location sketch`;
  const cornerMarkers = buildCornerMarkers(layout);
  const sectorHotspots = buildSectorHotspots(layout);
  const cornerHotspots = buildCornerHotspots(layout, cornerMarkers);
  const interactiveHotspots = [...sectorHotspots, ...cornerHotspots];
  const mapStageStyle: CSSProperties = {
    aspectRatio: getLayoutAspectRatio(layout.viewBox),
  };
  const { width: viewBoxWidth, height: viewBoxHeight } = getViewBoxMetrics(
    layout.viewBox
  );
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<InteractiveHotspot | null>(
    null
  );
  const zoomPercent = Math.round(zoom * 100);
  const isZoomed = zoom > MIN_ZOOM;
  const transformStyle = {
    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
  };

  const setMapZoom = (value: number): void => {
    const nextZoom = clampZoom(value);
    setZoom(nextZoom);
    setPanOffset((currentOffset) => clampPanOffset(currentOffset, nextZoom));
  };

  const handleZoomIn = (): void => setMapZoom(zoom + ZOOM_STEP);
  const handleZoomOut = (): void => setMapZoom(zoom - ZOOM_STEP);

  const handleResetView = (): void => {
    setZoom(MIN_ZOOM);
    setPanOffset({ x: 0, y: 0 });
    setDragState(null);
    setActiveHotspot(null);
  };

  const handleHotspotActivate = (hotspot: InteractiveHotspot): void => {
    setActiveHotspot(hotspot);
  };

  const handleHotspotDeactivate = (hotspotId: string): void => {
    setActiveHotspot((current) => (current?.id === hotspotId ? null : current));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isZoomed) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      originX: panOffset.x,
      originY: panOffset.y,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setPanOffset(
      clampPanOffset(
        {
          x: dragState.originX + event.clientX - dragState.x,
          y: dragState.originY + event.clientY - dragState.y,
        },
        zoom
      )
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }
  };

  return (
    <section
      className="mx-auto mt-8 max-w-7xl overflow-hidden rounded-3xl border border-(--background-color2) bg-(--background-buttons) shadow-lg shadow-black/5"
      aria-labelledby="circuit-track-layout"
    >
      <div className="grid gap-0 lg:grid-cols-[1.45fr_0.9fr]">
        <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_20%_20%,rgba(229,97,97,0.16),transparent_28%),linear-gradient(135deg,var(--background-color),var(--background-buttons))] p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--color3)">
                Interactive track map
              </p>
              <p className="mt-1 text-sm text-(--text-color2)">
                Zoom in for corner detail, then drag the map to explore.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="rounded-full border border-(--background-color2) bg-(--background-color) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-(--color3) hover:text-(--color3) disabled:cursor-not-allowed disabled:opacity-45"
              >
                Zoom out
              </button>
              <label className="flex items-center gap-2 rounded-full border border-(--background-color2) bg-(--background-color) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span>Zoom</span>
                <input
                  aria-label="Track map zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(event) => setMapZoom(Number(event.target.value))}
                  className="h-1.5 w-24 accent-(--color3)"
                />
              </label>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="rounded-full border border-(--background-color2) bg-(--background-color) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-(--color3) hover:text-(--color3) disabled:cursor-not-allowed disabled:opacity-45"
              >
                Zoom in
              </button>
              <button
                type="button"
                onClick={handleResetView}
                disabled={!isZoomed && panOffset.x === 0 && panOffset.y === 0}
                className="rounded-full border border-(--color3) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color1) transition-colors hover:bg-(--color3) hover:text-(--background-color) disabled:cursor-not-allowed disabled:opacity-45"
              >
                Reset view
              </button>
            </div>
          </div>

          <div
            aria-label="Zoomable track map viewport"
            role="region"
            className={`relative flex min-h-[330px] touch-none items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-(--background-color) ${
              isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div
              className="relative flex min-h-[310px] w-full items-center justify-center transition-transform duration-200 ease-out"
              style={transformStyle}
            >
              <div
                className="relative flex min-h-[310px] w-full max-w-[500px] items-center justify-center"
                data-testid="track-map-stage"
                style={mapStageStyle}
              >
                {shouldUseAccurateVector ? (
                  <img
                    src={vectorAsset?.url}
                    alt={ariaLabel}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full max-h-[420px] w-full select-none object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.28)]"
                    onError={() => {
                      if (vectorAsset?.url) {
                        setFailedVectorUrl(vectorAsset.url);
                      }
                    }}
                  />
                ) : (
                  <svg
                    role="img"
                    aria-label={ariaLabel}
                    viewBox={layout.viewBox}
                    preserveAspectRatio="xMidYMid meet"
                    className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                  >
                    <title>{ariaLabel}</title>
                    <desc>
                      {hasExactLayout
                        ? `Fallback vector trace for ${layout.title}, including sector hotspots and corner references.`
                        : `Fallback location sketch for ${circuitName}; exact vector layout data is not available yet.`}
                    </desc>
                    <defs>
                      <pattern
                        id={gridId}
                        width="28"
                        height="28"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M28 0H0V28"
                          fill="none"
                          stroke="currentColor"
                          strokeOpacity="0.08"
                        />
                      </pattern>
                      <linearGradient
                        id={gradientId}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="var(--color1)" />
                        <stop offset="52%" stopColor="var(--color3)" />
                        <stop offset="100%" stopColor="var(--color2)" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width={viewBoxWidth}
                      height={viewBoxHeight}
                      rx="28"
                      fill={`url(#${gridId})`}
                    />
                    <path
                      d={layout.path}
                      fill="none"
                      stroke="rgba(0,0,0,0.24)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="34"
                    />
                    <path
                      d={layout.path}
                      fill="none"
                      stroke="var(--background-color)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="23"
                    />
                    <path
                      d={layout.path}
                      fill="none"
                      stroke={`url(#${gradientId})`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="7"
                    />
                    <path
                      d={layout.path}
                      fill="none"
                      opacity="0.78"
                      stroke="var(--text-color)"
                      strokeDasharray="12 18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                )}

                <TrackMapHotspotsOverlay
                  viewBox={layout.viewBox}
                  hotspots={interactiveHotspots}
                  activeHotspotId={activeHotspot?.id ?? null}
                  onActivate={handleHotspotActivate}
                  onDeactivate={handleHotspotDeactivate}
                />
              </div>
            </div>
          </div>
          <div
            className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4 backdrop-blur"
            role="status"
            aria-label="Track map hotspot details"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color3)">
              {activeHotspot ? activeHotspot.eyebrow : "Hotspot guide"}
            </p>
            <p className="mt-2 font-['F1_Bold'] text-lg text-(--text-color)">
              {activeHotspot ? activeHotspot.title : "Hover a sector or corner"}
            </p>
            <p className="mt-2 text-sm leading-6 text-(--text-color2)">
              {activeHotspot
                ? activeHotspot.summary
                : "Move over a sector or corner marker to surface circuit context without leaving the map."}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-(--text-color2)">
              {activeHotspot
                ? activeHotspot.meta
                : `${interactiveHotspots.length} interactive hotspots available`}
            </p>
          </div>
          <p
            className="mt-3 text-center text-xs uppercase tracking-[0.16em] text-(--text-color2)"
            aria-live="polite"
          >
            {zoomPercent}% zoom ·{" "}
            {isZoomed
              ? "drag to pan, then hover hotspots"
              : "use controls or hover hotspots to inspect the layout"}
          </p>
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-(--background-color2) bg-(--background-color) p-6 lg:border-l lg:border-t-0 lg:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-(--color3)">
              Circuit intelligence
            </p>
            <h2
              id="circuit-track-layout"
              className="mt-2 font-['F1_Bold'] text-2xl"
            >
              Track map explorer
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--text-color2)">
              {shouldUseAccurateVector
                ? `An accurate sourced SVG render of ${layout.title}, paired with lap stats, turn markers, and reference points for the circuit.`
                : hasExactLayout
                  ? `A fallback SVG trace of ${layout.title}, paired with lap stats, turn markers, and reference points for the circuit.`
                  : `Exact vector track data is not available for ${circuitName} yet, so this panel keeps the location context visible while linking to maps.`}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-(--text-color2)">
                Lap length
              </dt>
              <dd className="mt-2 font-semibold">{layout.lengthKm}</dd>
            </div>
            <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-(--text-color2)">
                Turns
              </dt>
              <dd className="mt-2 font-semibold">{layout.turns || "TBC"}</dd>
            </div>
            <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-(--text-color2)">
                Direction
              </dt>
              <dd className="mt-2 font-semibold">{layout.direction}</dd>
            </div>
            <div className="rounded-2xl border border-(--background-color2) bg-(--background-buttons) p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-(--text-color2)">
                Signature run
              </dt>
              <dd className="mt-2 font-semibold">{layout.longestStraight}</dd>
            </div>
          </dl>

          <div>
            <h3 className="text-xs uppercase tracking-[0.18em] text-(--text-color2)">
              Map markers
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-(--text-color2)">
              {layout.markers.map((marker) => (
                <li key={marker.label} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: markerFill(marker.type) }}
                  />
                  <span>{marker.label}</span>
                </li>
              ))}
            </ul>
            {cornerMarkers.length > 0 ? (
              <p className="mt-3 rounded-2xl border border-(--background-color2) bg-(--background-buttons) px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-color2)">
                Corner markers:{" "}
                {cornerMarkers.map((corner) => corner.label).join(", ")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-(--text-color2)">
            <span>
              {locality}, {country}
              {latitude && longitude ? ` · ${latitude}, ${longitude}` : ""}
            </span>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-(--color3) px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color1) transition-colors hover:bg-(--color3) hover:text-(--background-color)"
            >
              Open satellite map
            </a>
          </div>

          {shouldUseAccurateVector && vectorAsset ? (
            <p className="text-xs leading-5 text-(--text-color2)">
              Accurate vector source:{" "}
              <a
                href={vectorAsset.sourceHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-(--color3) hover:text-(--color1)"
              >
                {vectorAsset.attributionLabel}
              </a>{" "}
              ·{" "}
              <a
                href={vectorAsset.licenseHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-(--color3) hover:text-(--color1)"
              >
                CC BY 4.0
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default CircuitMap;
