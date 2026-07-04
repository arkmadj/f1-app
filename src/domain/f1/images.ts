// Maps driver/constructor nationality strings supplied by the Jolpica/Ergast
// F1 API (e.g. `"Dutch"`, `"British"`) to their ISO 3166-1 alpha-2 country
// codes consumable by `react-world-flags`.

const NATIONALITY_TO_COUNTRY_CODE = {
  American: "US",
  Australian: "AU",
  Austrian: "AT",
  Belgian: "BE",
  Brazilian: "BR",
  British: "GB",
  Canadian: "CA",
  Chinese: "CN",
  Danish: "DK",
  Dutch: "NL",
  Finnish: "FI",
  French: "FR",
  German: "DE",
  Hungarian: "HU",
  Italian: "IT",
  Japanese: "JP",
  Mexican: "MX",
  Monegasque: "MC",
  Polish: "PL",
  Portuguese: "PT",
  Russian: "RU",
  Spanish: "ES",
  Swiss: "CH",
  Thai: "TH",
} as const satisfies Record<string, string>;

export type Nationality = keyof typeof NATIONALITY_TO_COUNTRY_CODE;
export type NationalityCountryCode =
  (typeof NATIONALITY_TO_COUNTRY_CODE)[Nationality];

// Frozen, strictly-typed map exposed for callers that already know the
// nationality at compile time.
const nationalityToCountryCode: Readonly<
  Record<Nationality, NationalityCountryCode>
> = Object.freeze({ ...NATIONALITY_TO_COUNTRY_CODE });

// Pre-computed normalized lookup so callers don't pay for it on every call.
const NORMALIZED_LOOKUP: ReadonlyMap<string, NationalityCountryCode> = new Map(
  (
    Object.entries(NATIONALITY_TO_COUNTRY_CODE) as [
      Nationality,
      NationalityCountryCode,
    ][]
  ).map(([name, code]) => [name.trim().toLowerCase(), code])
);

/**
 * Resolve an Ergast-style nationality (e.g. `"Dutch"`, `"british"`) to an
 * ISO 3166-1 alpha-2 country code. Returns an empty string when the input
 * is not recognised, allowing the result to be passed straight to
 * `<Flag code={...} />` without further null-checks.
 */
export function nationalityCountryCode(
  nationality: string | null | undefined
): NationalityCountryCode | "" {
  if (typeof nationality !== "string") return "";
  return NORMALIZED_LOOKUP.get(nationality.trim().toLowerCase()) ?? "";
}

export default nationalityToCountryCode;
