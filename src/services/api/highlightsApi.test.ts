import { describe, expect, it } from "vitest";
import {
  buildOfficialF1HighlightsSearchUrl,
  parseOfficialF1RaceHighlightsUrl,
} from "./highlightsApi";

const buildSearchPageHtml = (raceTitle: string): string => {
  const initialData = {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [
              {
                itemSectionRenderer: {
                  contents: [
                    {
                      videoRenderer: {
                        videoId: "wrong",
                        title: { runs: [{ text: `Qualifying Highlights | ${raceTitle}` }] },
                        longBylineText: { runs: [{ text: "FORMULA 1" }] },
                      },
                    },
                    {
                      videoRenderer: {
                        videoId: "9wiQqcKUahc",
                        title: { runs: [{ text: `Race Highlights | ${raceTitle}` }] },
                        longBylineText: { runs: [{ text: "FORMULA 1" }] },
                      },
                    },
                    {
                      videoRenderer: {
                        videoId: "fan-upload",
                        title: { runs: [{ text: `Race Highlights | ${raceTitle}` }] },
                        longBylineText: { runs: [{ text: "Random Channel" }] },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  };

  return `<script>var ytInitialData = ${JSON.stringify(initialData)};<\/script>`;
};

const searchPageHtml = buildSearchPageHtml("2024 Miami Grand Prix");

describe("services/api/highlightsApi", () => {
  it("builds the official F1 YouTube search URL", () => {
    expect(
      buildOfficialF1HighlightsSearchUrl({
        season: "2024",
        raceName: "Miami Grand Prix",
      })
    ).toBe(
      "https://www.youtube.com/results?search_query=Race+Highlights+%7C+2024+Miami+Grand+Prix+FORMULA+1"
    );
  });

  it("extracts the official F1 race highlights watch URL from search results", () => {
    expect(
      parseOfficialF1RaceHighlightsUrl(searchPageHtml, {
        season: "2024",
        raceName: "Miami Grand Prix",
      })
    ).toBe("https://www.youtube.com/watch?v=9wiQqcKUahc");
  });

  it("normalizes punctuation and diacritics when matching race names", () => {
    const saoPauloHtml = buildSearchPageHtml("2024 Sao Paulo Grand Prix");

    expect(
      parseOfficialF1RaceHighlightsUrl(saoPauloHtml, {
        season: "2024",
        raceName: "São Paulo Grand Prix",
      })
    ).toBe("https://www.youtube.com/watch?v=9wiQqcKUahc");
  });
});