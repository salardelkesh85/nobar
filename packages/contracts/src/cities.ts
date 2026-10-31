export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  provinceId: string;
  lat: number;
  lng: number;
  /** offered in the destination picker */
  destination: boolean;
}

/**
 * Operating provinces and cities: reference data owned by the admin context (docs/domain.md §2).
 * Nationwide marketplace: origins are where sellers are, destinations where buyers can order.
 * Shared by the backend (validation) and the frontends (packages/demo re-exports it).
 */
export const PROVINCES: readonly Province[] = [
  { id: "azg", name: "آذربایجان غربی" },
  { id: "azs", name: "آذربایجان شرقی" },
  { id: "thr", name: "تهران" },
  { id: "alb", name: "البرز" },
  { id: "mrk", name: "مرکزی" },
  { id: "mzn", name: "مازندران" },
  { id: "gil", name: "گیلان" },
  { id: "frs", name: "فارس" },
  { id: "krm", name: "کرمان" },
  { id: "kdn", name: "کردستان" },
  { id: "isf", name: "اصفهان" },
  { id: "khr", name: "خراسان رضوی" },
  { id: "khj", name: "خراسان جنوبی" },
  { id: "khz", name: "خوزستان" },
  { id: "qom", name: "قم" },
];

export const CITIES: readonly City[] = [
  { id: "tehran", name: "تهران", provinceId: "thr", lat: 35.689, lng: 51.389, destination: true },
  { id: "karaj", name: "کرج", provinceId: "alb", lat: 35.84, lng: 50.939, destination: true },
  { id: "urmia", name: "ارومیه", provinceId: "azg", lat: 37.552, lng: 45.076, destination: true },
  { id: "miandoab", name: "میاندوآب", provinceId: "azg", lat: 36.969, lng: 46.103, destination: true },
  { id: "naqadeh", name: "نقده", provinceId: "azg", lat: 36.955, lng: 45.388, destination: true },
  { id: "tabriz", name: "تبریز", provinceId: "azs", lat: 38.08, lng: 46.292, destination: true },
  { id: "isfahan", name: "اصفهان", provinceId: "isf", lat: 32.654, lng: 51.668, destination: true },
  { id: "shiraz", name: "شیراز", provinceId: "frs", lat: 29.592, lng: 52.584, destination: true },
  { id: "mashhad", name: "مشهد", provinceId: "khr", lat: 36.26, lng: 59.617, destination: true },
  { id: "rasht", name: "رشت", provinceId: "gil", lat: 37.281, lng: 49.583, destination: true },
  { id: "sari", name: "ساری", provinceId: "mzn", lat: 36.563, lng: 53.06, destination: true },
  { id: "ahvaz", name: "اهواز", provinceId: "khz", lat: 31.318, lng: 48.671, destination: true },
  { id: "kerman", name: "کرمان", provinceId: "krm", lat: 30.283, lng: 57.083, destination: true },
  { id: "sanandaj", name: "سنندج", provinceId: "kdn", lat: 35.314, lng: 46.999, destination: true },
  { id: "qom", name: "قم", provinceId: "qom", lat: 34.64, lng: 50.876, destination: true },
  { id: "saveh", name: "ساوه", provinceId: "mrk", lat: 35.021, lng: 50.357, destination: false },
  { id: "astara", name: "آستارا", provinceId: "gil", lat: 38.429, lng: 48.872, destination: false },
  { id: "jiroft", name: "جیرفت", provinceId: "krm", lat: 28.678, lng: 57.741, destination: false },
  { id: "bam", name: "بم", provinceId: "krm", lat: 29.106, lng: 58.357, destination: false },
  { id: "qaen", name: "قائن", provinceId: "khj", lat: 33.726, lng: 59.184, destination: false },
  { id: "fereydan", name: "فریدن", provinceId: "isf", lat: 32.937, lng: 50.12, destination: false },
];

export const CITY_IDS = CITIES.map((c) => c.id) as [string, ...string[]];
export const DEFAULT_CITY_ID = "tehran";
export const cityName = (id: string | undefined | null): string => CITIES.find((c) => c.id === id)?.name ?? id ?? "";
export const isCityId = (id: string): boolean => CITIES.some((c) => c.id === id);
