import { FaGithub } from "react-icons/fa";
import { useTranslation } from "react-i18next";

function ExternalLink(): JSX.Element {
  const { t } = useTranslation();

  return (
    <a
      href="https://github.com/arkmadj/f1-app"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("footer.sourceLinkAriaLabel")}
      className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-(--background-color2) bg-(--background-color) px-4 py-3 text-sm font-(--f1b) tracking-wide text-(--text-color) shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-(--color3) hover:text-(--color3) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color3) focus-visible:ring-offset-2 focus-visible:ring-offset-(--background-color)"
    >
      <FaGithub className="text-lg transition-transform duration-300 group-hover:scale-110" />
      <span>GitHub</span>
    </a>
  );
}

export default ExternalLink;
