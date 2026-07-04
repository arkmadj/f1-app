import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import NewsFeed from "./NewsFeed";
import { useLatestF1News } from "../../hooks/queries";

vi.mock("../../hooks/queries", () => ({
  useLatestF1News: vi.fn(),
}));

const setNewsQuery = (overrides = {}) => {
  useLatestF1News.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    ...overrides,
  });
};

describe("NewsFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNewsQuery();
  });

  it("requests and renders the latest RSS-powered F1 news", () => {
    setNewsQuery({
      data: [
        {
          id: "story-1",
          title: "Ferrari reveal new upgrade",
          description: "Fresh parts arrive at Imola.",
          link: "https://www.formula1.com/en/latest/article/ferrari-upgrade",
          publishedAt: "2026-05-12T10:00:00.000Z",
        },
      ],
    });

    render(<NewsFeed />);

    expect(useLatestF1News).toHaveBeenCalledWith(6);
    expect(
      screen.getByRole("heading", { name: /formula 1 headlines/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ferrari reveal/i })
    ).toHaveAttribute(
      "href",
      "https://www.formula1.com/en/latest/article/ferrari-upgrade"
    );
    expect(
      screen.getByText("Fresh parts arrive at Imola.")
    ).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    setNewsQuery({ isLoading: true });
    render(<NewsFeed />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /loading latest f1 news/i
    );
  });

  it("shows an error state", () => {
    setNewsQuery({ error: new Error("boom") });
    render(<NewsFeed />);
    expect(
      screen.getByText(/unable to load the latest f1 news/i)
    ).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<NewsFeed />);
    expect(
      screen.getByRole("heading", { name: /no f1 news available/i })
    ).toBeInTheDocument();
  });

  it("renders translated home news copy in Spanish", async () => {
    await i18n.changeLanguage("es");

    render(<NewsFeed />);

    expect(
      screen.getByRole("heading", { name: /titulares de fórmula 1/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver todo en formula1.com/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /no hay noticias de f1 disponibles/i,
      })
    ).toBeInTheDocument();
  });
});
