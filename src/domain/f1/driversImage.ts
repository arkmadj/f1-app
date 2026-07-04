import VER_PROFILE from "../../assets/images/drivers/web/v1/verstappen.webp";
import NOR_PROFILE from "../../assets/images/drivers/web/v1/norris.webp";
import LEC_PROFILE from "../../assets/images/drivers/web/v1/leclerc.webp";
import SAI_PROFILE from "../../assets/images/drivers/web/v1/sainz.webp";
import PER_PROFILE from "../../assets/images/drivers/web/v1/perez.webp";
import PIA_PROFILE from "../../assets/images/drivers/web/v1/piastri.webp";
import RUS_PROFILE from "../../assets/images/drivers/web/v1/russell.webp";
import ALO_PROFILE from "../../assets/images/drivers/web/v1/alonso.webp";
import TSU_PROFILE from "../../assets/images/drivers/web/v1/tsunoda.webp";
import STR_PROFILE from "../../assets/images/drivers/web/v1/stroll.webp";
import RIC_PROFILE from "../../assets/images/drivers/web/v1/ricciardo.webp";
import BEA_PROFILE from "../../assets/images/drivers/web/v1/bearman.webp";
import HUL_PROFILE from "../../assets/images/drivers/web/v1/hulkenberg.webp";
import GAS_PROFILE from "../../assets/images/drivers/web/v1/gasly.webp";
import OCO_PROFILE from "../../assets/images/drivers/web/v1/ocon.webp";
import ALB_PROFILE from "../../assets/images/drivers/web/v1/albon.webp";
import MAG_PROFILE from "../../assets/images/drivers/web/v1/magnussen.webp";
import ZHO_PROFILE from "../../assets/images/drivers/web/v1/zhou.webp";
import BOT_PROFILE from "../../assets/images/drivers/web/v1/bottas.webp";
import HAM_PROFILE from "../../assets/images/drivers/web/v1/hamilton.webp";
import SAR_PROFILE from "../../assets/images/drivers/web/v1/sargeant.webp";
import VER_RACE from "../../assets/images/drivers/web/v2/verstappen.webp";
import NOR_RACE from "../../assets/images/drivers/web/v2/norris.webp";
import LEC_RACE from "../../assets/images/drivers/web/v2/leclerc.webp";
import SAI_RACE from "../../assets/images/drivers/web/v2/sainz.webp";
import PER_RACE from "../../assets/images/drivers/web/v2/perez.webp";
import PIA_RACE from "../../assets/images/drivers/web/v2/piastri.webp";
import RUS_RACE from "../../assets/images/drivers/web/v2/russell.webp";
import ALO_RACE from "../../assets/images/drivers/web/v2/alonso.webp";
import TSU_RACE from "../../assets/images/drivers/web/v2/tsunoda.webp";
import STR_RACE from "../../assets/images/drivers/web/v2/stroll.webp";
import RIC_RACE from "../../assets/images/drivers/web/v2/ricciardo.webp";
import BEA_RACE from "../../assets/images/drivers/web/v2/bearman.webp";
import HUL_RACE from "../../assets/images/drivers/web/v2/hulkenberg.webp";
import GAS_RACE from "../../assets/images/drivers/web/v2/gasly.webp";
import OCO_RACE from "../../assets/images/drivers/web/v2/ocon.webp";
import ALB_RACE from "../../assets/images/drivers/web/v2/albon.webp";
import MAG_RACE from "../../assets/images/drivers/web/v2/magnussen.webp";
import ZHO_RACE from "../../assets/images/drivers/web/v2/zhou.webp";
import BOT_RACE from "../../assets/images/drivers/web/v2/bottas.webp";
import HAM_RACE from "../../assets/images/drivers/web/v2/hamilton.webp";
import SAR_RACE from "../../assets/images/drivers/web/v2/sargeant.webp";

export const DRIVER_IMAGE_VARIANTS = ["profile", "race"] as const;

export type DriverImageVariant = (typeof DRIVER_IMAGE_VARIANTS)[number];

export type DriverImageSources = Readonly<Record<DriverImageVariant, string>>;

const driverImageEntries = [
  ["max_verstappen", { profile: VER_PROFILE, race: VER_RACE }],
  ["norris", { profile: NOR_PROFILE, race: NOR_RACE }],
  ["leclerc", { profile: LEC_PROFILE, race: LEC_RACE }],
  ["sainz", { profile: SAI_PROFILE, race: SAI_RACE }],
  ["perez", { profile: PER_PROFILE, race: PER_RACE }],
  ["piastri", { profile: PIA_PROFILE, race: PIA_RACE }],
  ["russell", { profile: RUS_PROFILE, race: RUS_RACE }],
  ["alonso", { profile: ALO_PROFILE, race: ALO_RACE }],
  ["tsunoda", { profile: TSU_PROFILE, race: TSU_RACE }],
  ["stroll", { profile: STR_PROFILE, race: STR_RACE }],
  ["ricciardo", { profile: RIC_PROFILE, race: RIC_RACE }],
  ["bearman", { profile: BEA_PROFILE, race: BEA_RACE }],
  ["hulkenberg", { profile: HUL_PROFILE, race: HUL_RACE }],
  ["gasly", { profile: GAS_PROFILE, race: GAS_RACE }],
  ["ocon", { profile: OCO_PROFILE, race: OCO_RACE }],
  ["albon", { profile: ALB_PROFILE, race: ALB_RACE }],
  ["kevin_magnussen", { profile: MAG_PROFILE, race: MAG_RACE }],
  ["zhou", { profile: ZHO_PROFILE, race: ZHO_RACE }],
  ["bottas", { profile: BOT_PROFILE, race: BOT_RACE }],
  ["sargeant", { profile: SAR_PROFILE, race: SAR_RACE }],
  ["hamilton", { profile: HAM_PROFILE, race: HAM_RACE }],
] as const satisfies readonly (readonly [string, DriverImageSources])[];

export type DriverImageId = (typeof driverImageEntries)[number][0];
export type DriverImageSrc = DriverImageSources[DriverImageVariant];
export type DriverImageMap = Readonly<
  Record<DriverImageId, DriverImageSources>
>;

export const DEFAULT_DRIVER_IMAGE_VARIANT: DriverImageVariant = "race";

const hasOwn = <T extends object>(
  object: T,
  key: PropertyKey
): key is keyof T => Object.prototype.hasOwnProperty.call(object, key);

const driversImage = Object.freeze(
  Object.fromEntries(
    driverImageEntries.map(([driverId, images]) => [
      driverId,
      Object.freeze(images),
    ])
  )
) as DriverImageMap;

export const isDriverImageId = (
  driverId: string | null | undefined
): driverId is DriverImageId =>
  typeof driverId === "string" && hasOwn(driversImage, driverId);

export const isDriverImageVariant = (
  variant: string | null | undefined
): variant is DriverImageVariant =>
  typeof variant === "string" &&
  DRIVER_IMAGE_VARIANTS.includes(variant as DriverImageVariant);

export const getDriverImage = (
  driverId: string | null | undefined,
  variant: DriverImageVariant = DEFAULT_DRIVER_IMAGE_VARIANT
): DriverImageSrc | undefined =>
  isDriverImageId(driverId) ? driversImage[driverId][variant] : undefined;

export default driversImage;
