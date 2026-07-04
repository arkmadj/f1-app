import { describe, expect, it } from "vitest";
import { buildRssRequestUrl, parseLatestF1News } from "./newsApi";

const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Ferrari reveal new upgrade</title>
      <description><![CDATA[<p>Fresh parts arrive at Imola.</p>]]></description>
      <link>https://www.formula1.com/en/latest/article/ferrari-upgrade</link>
      <guid>ferrari-upgrade</guid>
      <pubDate>Tue, 12 May 2026 10:00:00 GMT</pubDate>
      <enclosure url="https://example.com/ferrari.jpg" type="image/jpeg" />
    </item>
    <item>
      <title>Mercedes confirm reserve plan</title>
      <description>Driver line-up update</description>
      <link>https://www.formula1.com/en/latest/article/mercedes-reserve</link>
      <guid>mercedes-reserve</guid>
    </item>
  </channel>
</rss>`;

describe("services/api/newsApi", () => {
  it("parses RSS items into F1 news cards", () => {
    expect(parseLatestF1News(rss)).toEqual([
      {
        id: "ferrari-upgrade",
        title: "Ferrari reveal new upgrade",
        description: "Fresh parts arrive at Imola.",
        link: "https://www.formula1.com/en/latest/article/ferrari-upgrade",
        publishedAt: "2026-05-12T10:00:00.000Z",
        imageUrl: "https://example.com/ferrari.jpg",
      },
      {
        id: "mercedes-reserve",
        title: "Mercedes confirm reserve plan",
        description: "Driver line-up update",
        link: "https://www.formula1.com/en/latest/article/mercedes-reserve",
        publishedAt: undefined,
        imageUrl: undefined,
      },
    ]);
  });

  it("limits parsed items", () => {
    expect(parseLatestF1News(rss, 1)).toHaveLength(1);
  });

  it("skips incomplete RSS items", () => {
    const incompleteRss = `<?xml version="1.0"?><rss><channel><item><title>Missing link</title></item></channel></rss>`;
    expect(parseLatestF1News(incompleteRss)).toEqual([]);
  });

  it("builds the proxied RSS request URL", () => {
    expect(buildRssRequestUrl("https://example.com/feed.xml")).toBe(
      "https://api.allorigins.win/raw?url=https%3A%2F%2Fexample.com%2Ffeed.xml"
    );
  });
});
