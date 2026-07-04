// Maps F1 driver permanent numbers (as integers) to their corresponding
// number image assets. These permanent numbers are assigned to drivers by the
// FIA and remain with them throughout their F1 career.

import VER from "../../assets/images/nums/web/verstappen.webp";
import NOR from "../../assets/images/nums/web/norris.webp";
import LEC from "../../assets/images/nums/web/leclerc.webp";
import SAI from "../../assets/images/nums/web/sainz.webp";
import PER from "../../assets/images/nums/web/perez.webp";
import PIA from "../../assets/images/nums/web/piastri.webp";
import RUS from "../../assets/images/nums/web/russell.webp";
import ALO from "../../assets/images/nums/web/alonso.webp";
import TSU from "../../assets/images/nums/web/tsunoda.webp";
import STR from "../../assets/images/nums/web/stroll.webp";
import RIC from "../../assets/images/nums/web/ricciardo.webp";
import BEA from "../../assets/images/nums/web/bearman.webp";
import HUL from "../../assets/images/nums/web/hulkenberg.webp";
import GAS from "../../assets/images/nums/web/gasly.webp";
import OCO from "../../assets/images/nums/web/ocon.webp";
import ALB from "../../assets/images/nums/web/albon.webp";
import MAG from "../../assets/images/nums/web/magnussen.webp";
import ZHO from "../../assets/images/nums/web/zhou.webp";
import BOT from "../../assets/images/nums/web/bottas.webp";
import HAM from "../../assets/images/nums/web/hamilton.webp";
import SAR from "../../assets/images/nums/web/sargeant.webp";

const PERMANENT_NUMBER_IMAGES = {
  1: VER, // Max Verstappen (current champion number)
  2: SAR, // Logan Sargeant
  3: RIC, // Daniel Ricciardo
  4: NOR, // Lando Norris
  10: GAS, // Pierre Gasly
  11: PER, // Sergio Perez
  14: ALO, // Fernando Alonso
  16: LEC, // Charles Leclerc
  18: STR, // Lance Stroll
  20: MAG, // Kevin Magnussen
  22: TSU, // Yuki Tsunoda
  23: ALB, // Alexander Albon
  24: ZHO, // Zhou Guanyu
  27: HUL, // Nico Hulkenberg
  31: OCO, // Esteban Ocon
  33: VER, // Max Verstappen (permanent number)
  38: BEA, // Oliver Bearman
  44: HAM, // Lewis Hamilton
  55: SAI, // Carlos Sainz
  63: RUS, // George Russell
  77: BOT, // Valtteri Bottas
  81: PIA, // Oscar Piastri
} as const satisfies Record<number, string>;

export type PermanentNumber = keyof typeof PERMANENT_NUMBER_IMAGES;
export type NumberImage = (typeof PERMANENT_NUMBER_IMAGES)[PermanentNumber];
export type PermanentNumberInput = string | number | null | undefined;

// Frozen, strictly-typed map exposed for callers that already know the
// permanent number at compile time.
const permanentNumber: Readonly<Record<PermanentNumber, NumberImage>> =
  Object.freeze({ ...PERMANENT_NUMBER_IMAGES });

const KNOWN_PERMANENT_NUMBER_KEYS = new Set(Object.keys(permanentNumber));

function normalizePermanentNumber(
  permanentNum: PermanentNumberInput
): PermanentNumber | undefined {
  if (permanentNum === null || permanentNum === undefined) return undefined;

  const numericPermanentNumber =
    typeof permanentNum === "string"
      ? Number(permanentNum.trim())
      : permanentNum;

  if (!Number.isFinite(numericPermanentNumber)) return undefined;

  return KNOWN_PERMANENT_NUMBER_KEYS.has(String(numericPermanentNumber))
    ? (numericPermanentNumber as PermanentNumber)
    : undefined;
}

/**
 * Resolve a driver's permanent number to the corresponding number image asset.
 * Accepts the number as either a string or number (e.g. `"44"`, `44`, `1`, `"1"`).
 * Returns `undefined` when the input is missing or not a recognised permanent
 * number, so callers can render conditionally without runtime errors.
 *
 * @example
 * ```ts
 * const img = getPermanentNumberImage(44);        // Returns Hamilton's number image
 * const img2 = getPermanentNumberImage("44");     // Same result
 * const img3 = getPermanentNumberImage(null);     // Returns undefined
 * const img4 = getPermanentNumberImage(999);      // Returns undefined
 * ```
 */
export function getPermanentNumberImage(
  permanentNum: PermanentNumberInput
): NumberImage | undefined {
  const normalizedPermanentNumber = normalizePermanentNumber(permanentNum);

  return normalizedPermanentNumber === undefined
    ? undefined
    : permanentNumber[normalizedPermanentNumber];
}

export default permanentNumber;
