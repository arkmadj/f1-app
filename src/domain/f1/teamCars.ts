// Maps the team `name` strings returned by the Jolpica/Ergast F1 API
// (e.g. `"Red Bull"`, `"Aston Martin"`) to the corresponding car image
// asset URL. Keys are constrained to a known union so callers get
// compile-time errors for typos or unsupported teams.

import Mercedes from "../../assets/images/teamCars/web/mercedes.webp";
import RedBull from "../../assets/images/teamCars/web/redbull.webp";
import Ferrari from "../../assets/images/teamCars/web/ferrari.webp";
import AstonMartin from "../../assets/images/teamCars/web/astonmartin.webp";
import Alpine from "../../assets/images/teamCars/web/alpine.webp";
import RBF1 from "../../assets/images/teamCars/web/RBCA.webp";
import Sauber from "../../assets/images/teamCars/web/sauber.webp";
import McLaren from "../../assets/images/teamCars/web/mclaren.webp";
import Haas from "../../assets/images/teamCars/web/haas.webp";
import Williams from "../../assets/images/teamCars/web/williams.webp";

export type TeamName =
  | "Mercedes"
  | "Red Bull"
  | "Ferrari"
  | "Aston Martin"
  | "Alpine F1 Team"
  | "RB F1 Team"
  | "Sauber"
  | "McLaren"
  | "Haas F1 Team"
  | "Williams";

const teamCars: Readonly<Record<TeamName, string>> = {
  Mercedes,
  "Red Bull": RedBull,
  Ferrari,
  "Aston Martin": AstonMartin,
  "Alpine F1 Team": Alpine,
  "RB F1 Team": RBF1,
  Sauber,
  McLaren,
  "Haas F1 Team": Haas,
  Williams,
};

// Narrows an arbitrary string (e.g. from an API response) to a known
// `TeamName`, allowing callers to use the strongly-typed map without
// resorting to unsafe casts.
export const isTeamName = (name: string): name is TeamName =>
  Object.prototype.hasOwnProperty.call(teamCars, name);

// Safe lookup for callers that only have an untyped `string` in hand.
// Returns `undefined` for unknown teams so consumers must explicitly
// handle the missing-asset case.
export const getTeamCar = (name: string): string | undefined =>
  isTeamName(name) ? teamCars[name] : undefined;

export default teamCars;
