const CORS_PROXY_URL = "https://api.allorigins.win/raw";
const OFFICIAL_F1_CHANNEL_NAME = "FORMULA 1";

type RaceHighlightsLookupInput = {
  season: string;
  raceName: string;
};

type YouTubeVideoRenderer = {
  videoId?: string;
  title?: { simpleText?: string; runs?: Array<{ text?: string }> };
  longBylineText?: { simpleText?: string; runs?: Array<{ text?: string }> };
  ownerText?: { simpleText?: string; runs?: Array<{ text?: string }> };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readRunsText = (
  value?: { simpleText?: string; runs?: Array<{ text?: string }> }
): string =>
  value?.simpleText ??
  value?.runs?.map((entry) => entry.text?.trim() ?? "").join("") ??
  "";

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

const extractInitialDataJson = (html: string): string | null => {
  const marker = "var ytInitialData = ";
  const startIndex = html.indexOf(marker);
  if (startIndex === -1) return null;

  const jsonStart = html.indexOf("{", startIndex + marker.length);
  if (jsonStart === -1) return null;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (character === "\\") {
        isEscaped = true;
        continue;
      }
      if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character !== "}") continue;
    depth -= 1;
    if (depth === 0) {
      return html.slice(jsonStart, index + 1);
    }
  }

  return null;
};

const collectVideoRenderers = (
  value: unknown,
  renderers: YouTubeVideoRenderer[] = []
): YouTubeVideoRenderer[] => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectVideoRenderers(entry, renderers));
    return renderers;
  }

  if (!isRecord(value)) return renderers;

  const renderer = value.videoRenderer;
  if (isRecord(renderer)) {
    renderers.push(renderer as YouTubeVideoRenderer);
  }

  Object.values(value).forEach((entry) => collectVideoRenderers(entry, renderers));
  return renderers;
};

export const buildOfficialF1HighlightsSearchUrl = ({
  season,
  raceName,
}: RaceHighlightsLookupInput): string => {
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set(
    "search_query",
    `Race Highlights | ${season} ${raceName} ${OFFICIAL_F1_CHANNEL_NAME}`
  );
  return url.toString();
};

export const parseOfficialF1RaceHighlightsUrl = (
  html: string,
  { season, raceName }: RaceHighlightsLookupInput
): string | undefined => {
  const initialDataJson = extractInitialDataJson(html);
  if (!initialDataJson) return undefined;

  const initialData = JSON.parse(initialDataJson) as unknown;
  const normalizedTarget = normalizeText(`${season} ${raceName}`);

  const match = collectVideoRenderers(initialData).find((renderer) => {
    const title = readRunsText(renderer.title);
    const channelName = readRunsText(renderer.longBylineText || renderer.ownerText);
    const normalizedTitle = normalizeText(title);

    return (
      channelName === OFFICIAL_F1_CHANNEL_NAME &&
      normalizedTitle.startsWith("race highlights") &&
      normalizedTitle.includes(normalizedTarget)
    );
  });

  return match?.videoId
    ? `https://www.youtube.com/watch?v=${match.videoId}`
    : undefined;
};

export const getOfficialF1RaceHighlightsUrl = async (
  input: RaceHighlightsLookupInput
): Promise<string | undefined> => {
  const response = await fetch(
    `${CORS_PROXY_URL}?url=${encodeURIComponent(buildOfficialF1HighlightsSearchUrl(input))}`,
    { headers: { Accept: "text/html,application/xhtml+xml" } }
  );

  if (!response.ok) {
    throw new Error(
      `Official F1 highlights lookup failed with status ${response.status}`
    );
  }

  return parseOfficialF1RaceHighlightsUrl(await response.text(), input);
};