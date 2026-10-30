/**
 * Demo clock: demo dates are relative to the moment the module loads, so the data never goes stale.
 * Rounded down to 10 minutes so the server render and the browser usually agree on the same instants.
 */
const TEN_MIN = 600_000;
export const NOW = new Date(Math.floor(Date.now() / TEN_MIN) * TEN_MIN);

export const daysAgo = (n: number, hour = 9): string => {
  const d = new Date(NOW.getTime() - n * 86_400_000);
  d.setUTCHours(hour - 3, 30, 0, 0); // ~hour:00 Tehran (UTC+3:30)
  return d.toISOString();
};

export const hoursAgo = (n: number): string => new Date(NOW.getTime() - n * 3_600_000).toISOString();
export const hoursFromNow = (n: number): string => new Date(NOW.getTime() + n * 3_600_000).toISOString();
