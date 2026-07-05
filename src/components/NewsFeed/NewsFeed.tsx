import { useTranslation } from "react-i18next";
import { useLatestF1News } from "../../hooks/queries";
import { F1_NEWS_FEED_PAGE_URL } from "../../services/api/newsApi";
import type { F1NewsItem } from "../../services/api/newsApi";
import EmptyState from "../EmptyState/EmptyState";

const NEWS_ITEM_LIMIT = 6;

const formatNewsDate = (value: string, language: string): string =>
  new Date(value).toLocaleDateString(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const renderNewsMeta = (
  item: F1NewsItem,
  language: string
): JSX.Element | null => {
  if (!item.publishedAt) return null;
  return (
    <time dateTime={item.publishedAt}>
      {formatNewsDate(item.publishedAt, language)}
    </time>
  );
};

function NewsFeed(): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const {
    data: news = [],
    isLoading,
    error,
  } = useLatestF1News(NEWS_ITEM_LIMIT, { throwOnError: false });

  return (
    <section
      className="mx-auto mt-10 mb-5 w-[min(100%,1100px)] text-(--text-color)"
      aria-labelledby="latest-f1-news-title"
    >
      <header className="mb-5 flex flex-wrap items-end justify-between gap-y-3 gap-x-6 text-left">
        <p className="m-0 w-full text-[0.8rem] font-bold tracking-[0.18em] text-(--color1) uppercase">
          {t("home.newsFeed.eyebrow")}
        </p>
        <h2 id="latest-f1-news-title">{t("home.newsFeed.heading")}</h2>
        <a
          href={F1_NEWS_FEED_PAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-(--color1) no-underline"
        >
          {t("home.newsFeed.viewAll")}
        </a>
      </header>

      {isLoading && (
        <p
          className="m-0 rounded-2xl border border-dashed border-(--background-color2) p-7 text-center leading-6 text-(--text-color3)"
          role="status"
        >
          {t("home.newsFeed.loading")}
        </p>
      )}

      {error && !isLoading && (
        <p className="m-0 rounded-2xl border border-dashed border-(--color1) p-7 text-center leading-6 text-(--color1)">
          {t("home.newsFeed.error")}
        </p>
      )}

      {!isLoading && !error && news.length === 0 && (
        <EmptyState
          title={t("home.newsFeed.emptyTitle")}
          message={t("home.newsFeed.emptyMessage")}
        />
      )}

      {!isLoading && !error && news.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {news.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-(--background-color2) bg-(--background-color) text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-(--color1) focus-within:-translate-y-0.5 focus-within:border-(--color1)"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="block aspect-video w-full object-cover"
                />
              )}
              <div className="p-[18px]">
                <div className="min-h-[1.2em] text-[0.78rem] font-bold text-(--text-color3) uppercase">
                  {renderNewsMeta(item, currentLanguage)}
                </div>
                <h3 className="my-2 text-base leading-[1.35]">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-inherit no-underline"
                  >
                    {item.title}
                  </a>
                </h3>
                {item.description && (
                  <p className="m-0 leading-6 text-(--text-color3)">
                    {item.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default NewsFeed;
