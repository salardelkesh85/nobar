export interface City {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
}

/**
 * Operating cities. Reference data owned by the admin context (docs/domain.md §2); until the admin
 * service exists it ships as a static, versioned list here.
 */
export const CITIES: readonly City[] = [
  { id: "tehran", name: "تهران", province: "تهران", lat: 35.6892, lng: 51.389 },
  { id: "isfahan", name: "اصفهان", province: "اصفهان", lat: 32.6546, lng: 51.668 },
  { id: "shiraz", name: "شیراز", province: "فارس", lat: 29.5918, lng: 52.5837 },
  { id: "mashhad", name: "مشهد", province: "خراسان رضوی", lat: 36.2605, lng: 59.6168 },
  { id: "tabriz", name: "تبریز", province: "آذربایجان شرقی", lat: 38.0962, lng: 46.2738 },
  { id: "rasht", name: "رشت", province: "گیلان", lat: 37.2808, lng: 49.5832 },
];

export const CITY_IDS = CITIES.map((c) => c.id) as [string, ...string[]];
export const DEFAULT_CITY_ID = "tehran";
export const cityName = (id: string | undefined | null): string => CITIES.find((c) => c.id === id)?.name ?? id ?? "";
export const isCityId = (id: string): boolean => CITIES.some((c) => c.id === id);
