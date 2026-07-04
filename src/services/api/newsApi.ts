export const F1_NEWS_RSS_URL = "https://www.formula1.com/en/latest/all.xml";
export const F1_NEWS_FEED_PAGE_URL = "https://www.formula1.com/en/latest/all";

const RSS_CORS_PROXY_URL = "https://api.allorigins.win/raw";

export interface F1NewsItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  publishedAt?: string;
  imageUrl?: string;
}

export const buildRssRequestUrl = (feedUrl: string = F1_NEWS_RSS_URL): string =>
  `${RSS_CORS_PROXY_URL}?url=${encodeURIComponent(feedUrl)}`;

const getChildText = (element: Element, localName: string): string => {
  const child = Array.from(element.children).find(
    (node) => node.localName === localName
  );
  return child?.textContent?.trim() ?? "";
};

const toPlainText = (value: string): string => {
  const document = new DOMParser().parseFromString(value, "text/html");
  return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
};

const toIsoDate = (value: string): string | undefined => {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? undefined
    : new Date(timestamp).toISOString();
};

const getImageUrl = (item: Element): string | undefined => {
  const imageNode = Array.from(item.children).find((node) => {
    const type = node.getAttribute("type") ?? "";
    return (
      (node.localName === "enclosure" && type.startsWith("image/")) ||
      ["content", "thumbnail"].includes(node.localName)
    );
  });

  return imageNode?.getAttribute("url") ?? undefined;
};

export const parseLatestF1News = (
  xml: string,
  limit: number = 6
): F1NewsItem[] => {
  const document = new DOMParser().parseFromString(xml, "text/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("Unable to parse F1 news RSS feed.");
  }

  return Array.from(document.querySelectorAll("item"))
    .map((item): F1NewsItem | null => {
      const title = getChildText(item, "title");
      const link = getChildText(item, "link");
      const description = toPlainText(getChildText(item, "description"));
      const publishedAt = toIsoDate(getChildText(item, "pubDate"));
      const id = getChildText(item, "guid") || link || title;

      if (!title || !link || !id) return null;

      return {
        id,
        title,
        link,
        description: description || undefined,
        publishedAt,
        imageUrl: getImageUrl(item),
      };
    })
    .filter((item): item is F1NewsItem => item !== null)
    .slice(0, limit);
};

export const getLatestF1News = async (
  limit: number = 6,
  feedUrl: string = F1_NEWS_RSS_URL
): Promise<F1NewsItem[]> => {
  const response = await fetch(buildRssRequestUrl(feedUrl), {
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });

  if (!response.ok) {
    throw new Error(
      `F1 news RSS request failed with status ${response.status}`
    );
  }

  return parseLatestF1News(await response.text(), limit);
};
