import { useTranslation } from "react-i18next";

function ErgastApi(): JSX.Element {
  const { t } = useTranslation();

  return (
    <a
      href="https://github.com/jolpica/jolpica-f1"
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-(--background-color2) bg-(--background-color) px-4 py-3 text-center font-(--f1r) text-xs leading-5 text-(--text-color2) shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-(--color3) hover:text-(--text-color) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
    >
      {t("footer.poweredBy")}
      <span className="font-(--f1b) text-(--color3) transition-colors duration-300 group-hover:text-(--color2)">
        Jolpica F1 API
      </span>
    </a>
  );
}

export default ErgastApi;
