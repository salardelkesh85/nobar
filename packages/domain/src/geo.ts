import { CITIES, PROVINCES } from "@nobar/contracts/cities";
import type { City, Province } from "./types";

export { CITIES, PROVINCES };

export const cityById = (id: string): City | undefined => CITIES.find((c) => c.id === id);
export const provinceById = (id: string): Province | undefined => PROVINCES.find((p) => p.id === id);
export const cityName = (id: string): string => cityById(id)?.name ?? id;
export const provinceOfCity = (id: string): Province | undefined => {
  const c = cityById(id);
  return c ? provinceById(c.provinceId) : undefined;
};
export const destinationCities = (): City[] => CITIES.filter((c) => c.destination);

/** Great-circle distance in km. */
export function distanceKm(a: City, b: City): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
