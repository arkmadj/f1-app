import { FiHome } from "react-icons/fi";
import { FaFlagCheckered } from "react-icons/fa";
import { GiF1Car } from "react-icons/gi";
import { Link } from "@tanstack/react-router";

const mobileLinkClass =
  "rounded-full p-2 text-(--text-color) transition-colors duration-300 hover:bg-(--background-buttons-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color3)";

function MobileMenu(): JSX.Element {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] mx-auto flex w-full items-center justify-around rounded-t-[15px] bg-(--background-color2) py-2.5 text-[40px] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] transition-all duration-500">
      <div className="flex gap-[100px] max-[520px]:gap-10">
        <Link className={mobileLinkClass} to={"/"}>
          <FiHome />
        </Link>
        <Link className={mobileLinkClass} to={"/"}>
          <FaFlagCheckered />
        </Link>
        <Link className={mobileLinkClass} to={"/"}>
          <GiF1Car />
        </Link>
      </div>
    </div>
  );
}

export default MobileMenu;
