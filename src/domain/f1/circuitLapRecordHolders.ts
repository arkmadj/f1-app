// Track lap-record holders keyed by the Ergast / Jolpica `circuitId`.
//
// Values are sourced from the public season-calendar datasets published in
// https://github.com/toUpperCase78/formula1-datasets (2022–2024) and cover the
// active modern F1 circuits surfaced by this app. Unknown or future circuits
// intentionally fall back to `undefined` so the UI can render `TBC`.

const CIRCUIT_LAP_RECORD_HOLDERS = Object.freeze({
  albert_park: "Charles Leclerc",
  americas: "Charles Leclerc",
  baku: "Charles Leclerc",
  bahrain: "Pedro de la Rosa",
  catalunya: "Max Verstappen",
  hungaroring: "Lewis Hamilton",
  imola: "Lewis Hamilton",
  interlagos: "Valtteri Bottas",
  jeddah: "Lewis Hamilton",
  losail: "Lando Norris",
  marina_bay: "Daniel Ricciardo",
  miami: "Max Verstappen",
  monaco: "Lewis Hamilton",
  monza: "Rubens Barrichello",
  paul_ricard: "Sebastian Vettel",
  red_bull_ring: "Carlos Sainz",
  rodriguez: "Valtteri Bottas",
  shanghai: "Michael Schumacher",
  silverstone: "Max Verstappen",
  spa: "Sergio Pérez",
  suzuka: "Lewis Hamilton",
  vegas: "Lando Norris",
  villeneuve: "Valtteri Bottas",
  yas_marina: "Kevin Magnussen",
  zandvoort: "Lewis Hamilton",
} as const satisfies Readonly<Record<string, string>>);

type CircuitLapRecordHolderId = keyof typeof CIRCUIT_LAP_RECORD_HOLDERS;

const hasOwn = <T extends object>(
  object: T,
  key: PropertyKey
): key is keyof T => Object.prototype.hasOwnProperty.call(object, key);

export const getCircuitLapRecordHolder = (
  circuitId: string | null | undefined
): string | undefined =>
  typeof circuitId === "string" && hasOwn(CIRCUIT_LAP_RECORD_HOLDERS, circuitId)
    ? CIRCUIT_LAP_RECORD_HOLDERS[circuitId as CircuitLapRecordHolderId]
    : undefined;

export default CIRCUIT_LAP_RECORD_HOLDERS;
