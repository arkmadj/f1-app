import verstappenHelmet from "../../assets/images/helmets/web/verstappen.webp";
import norrisHelmet from "../../assets/images/helmets/web/norris.webp";
import leclercHelmet from "../../assets/images/helmets/web/leclerc.webp";
import sainzHelmet from "../../assets/images/helmets/web/sainz.webp";
import perezHelmet from "../../assets/images/helmets/web/perez.webp";
import piastriHelmet from "../../assets/images/helmets/web/piastri.webp";
import russellHelmet from "../../assets/images/helmets/web/russell.webp";
import alonsoHelmet from "../../assets/images/helmets/web/alonso.webp";
import tsunodaHelmet from "../../assets/images/helmets/web/tsunoda.webp";
import strollHelmet from "../../assets/images/helmets/web/stroll.webp";
import ricciardoHelmet from "../../assets/images/helmets/web/ricciardo.webp";
import hulkenbergHelmet from "../../assets/images/helmets/web/hulkenberg.webp";
import gaslyHelmet from "../../assets/images/helmets/web/gasly.webp";
import oconHelmet from "../../assets/images/helmets/web/ocon.webp";
import albonHelmet from "../../assets/images/helmets/web/albon.webp";
import magnussenHelmet from "../../assets/images/helmets/web/magnussen.webp";
import zhouHelmet from "../../assets/images/helmets/web/zhou.webp";
import bottasHelmet from "../../assets/images/helmets/web/bottas.webp";
import hamiltonHelmet from "../../assets/images/helmets/web/hamilton.webp";
import sargeantHelmet from "../../assets/images/helmets/web/sargeant.webp";

const helmetEntries = [
  ["max_verstappen", verstappenHelmet],
  ["norris", norrisHelmet],
  ["leclerc", leclercHelmet],
  ["sainz", sainzHelmet],
  ["perez", perezHelmet],
  ["piastri", piastriHelmet],
  ["russell", russellHelmet],
  ["alonso", alonsoHelmet],
  ["tsunoda", tsunodaHelmet],
  ["stroll", strollHelmet],
  ["ricciardo", ricciardoHelmet],
  ["bearman", ""],
  ["hulkenberg", hulkenbergHelmet],
  ["gasly", gaslyHelmet],
  ["ocon", oconHelmet],
  ["albon", albonHelmet],
  ["kevin_magnussen", magnussenHelmet],
  ["zhou", zhouHelmet],
  ["bottas", bottasHelmet],
  ["sargeant", sargeantHelmet],
  ["hamilton", hamiltonHelmet],
] as const satisfies readonly (readonly [string, string])[];

export type DriverHelmetId = (typeof helmetEntries)[number][0];
export type DriverHelmetMap = Readonly<Record<DriverHelmetId, string>>;

const hasOwn = <T extends object>(
  object: T,
  key: PropertyKey
): key is keyof T => Object.prototype.hasOwnProperty.call(object, key);

const helmets = Object.freeze(
  Object.fromEntries(helmetEntries)
) as DriverHelmetMap;

export const isDriverHelmetId = (
  driverId: string | null | undefined
): driverId is DriverHelmetId =>
  typeof driverId === "string" && hasOwn(helmets, driverId);

export const getDriverHelmet = (
  driverId: string | null | undefined
): string | undefined =>
  isDriverHelmetId(driverId) ? helmets[driverId] : undefined;

export default helmets;
