import { Link } from "@tanstack/react-router";
import { seasonSearchParams } from "../../domain/f1/seasons";
import { useSelectedSeason } from "../../hooks/useSelectedSeason";

const landingButtonClass =
  "m-2.5 w-4/5 max-w-100 rounded-[5px] border border-(--button-background) bg-(--background-color) px-7.5 py-3.75 text-base text-(--text-color) no-underline transition-all duration-300 hover:opacity-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.2)] sm:text-[1.2em]";

function Cards(): JSX.Element {
  const { selectedSeason } = useSelectedSeason();

  return (
    <div className="flex flex-col items-center justify-start bg-(--background-color) p-5 text-center">
      <h1>Welcome to the F1 App</h1>
      <Link
        to="/driverstandings"
        search={seasonSearchParams(selectedSeason)}
        className={landingButtonClass}
      >
        Driver Standings
      </Link>
      <Link
        to="/constructorstandings"
        search={seasonSearchParams(selectedSeason)}
        className={landingButtonClass}
      >
        Constructor Standings
      </Link>
      <Link
        to="/schedule"
        search={seasonSearchParams(selectedSeason)}
        className={landingButtonClass}
      >
        Race Calendar
      </Link>
      <Link
        to="/qualifying"
        search={seasonSearchParams(selectedSeason)}
        className={landingButtonClass}
      >
        Qualifyings
      </Link>
      <Link
        to="/race"
        search={seasonSearchParams(selectedSeason)}
        className={landingButtonClass}
      >
        Race Results
      </Link>
    </div>
  );
}

export default Cards;
