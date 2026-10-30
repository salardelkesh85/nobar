/**
 * Demo clock: demo dates are relative to the moment the module loads, so the data never goes stale.
 * Rounded down to 10 minutes so the server render and the browser usually agree on the same instants.
 */
const TEN_MIN = 600_000;
export const NOW = new Date(Math.floor(Date.now() / TEN_MIN) * TEN_MIN);

// Iran has used a fixed UTC+3:30 since daylight saving was abolished in 2022.
const TEHRAN_OFFSET = 3.5 * 3_600_000;

/** `hour`:00 Tehran time on the Tehran calendar day `n` days before NOW (negative n = future). */
export const daysAgo = (n: number, hour = 9): string => {
  const wall = new Date(NOW.getTime() + TEHRAN_OFFSET - n * 86_400_000); // Tehran wall clock, read via UTC getters
  wall.setUTCHours(hour, 0, 0, 0);
  return new Date(wall.getTime() - TEHRAN_OFFSET).toISOString();
};

export const hoursAgo = (n: number): string => new Date(NOW.getTime() - n * 3_600_000).toISOString();
export const hoursFromNow = (n: number): string => new Date(NOW.getTime() + n * 3_600_000).toISOString();
