// Maps human-readable country names supplied by the Jolpica/Ergast F1 API
// (race-circuit `country` field, plus a few common aliases) to their ISO
// 3166-1 alpha-2 country codes consumable by `react-world-flags`.

const COUNTRY_CODES = {
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahrain: "BH",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  China: "CN",
  France: "FR",
  Germany: "DE",
  Hungary: "HU",
  Italy: "IT",
  Japan: "JP",
  Mexico: "MX",
  Monaco: "MC",
  Netherlands: "NL",
  Portugal: "PT",
  Qatar: "QA",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  Spain: "ES",
  Turkey: "TR",
  UAE: "AE",
  UK: "GB",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  USA: "US",
} as const satisfies Record<string, string>;

export type CountryName = keyof typeof COUNTRY_CODES;
export type CountryCode = (typeof COUNTRY_CODES)[CountryName];

export const COUNTRY_CODE_MAP: Readonly<Record<CountryName, CountryCode>> =
  Object.freeze({ ...COUNTRY_CODES });

// Pre-computed normalized lookup so callers don't pay for it on every call.
const NORMALIZED_LOOKUP: ReadonlyMap<string, CountryCode> = new Map(
  (Object.entries(COUNTRY_CODES) as [CountryName, CountryCode][]).map(
    ([name, code]) => [name.trim().toLowerCase(), code]
  )
);

/**
 * Resolve a country name (e.g. `"United Kingdom"`, `"USA"`) to an ISO 3166-1
 * alpha-2 country code. Returns an empty string when the input is not a
 * recognised name, allowing the result to be passed straight to
 * `<Flag code={...} />` without further null-checks.
 */
export function countryCode(
  country: string | null | undefined
): CountryCode | "" {
  if (typeof country !== "string") return "";
  return NORMALIZED_LOOKUP.get(country.trim().toLowerCase()) ?? "";
}

export default countryCode;
