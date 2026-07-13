/**
 * Add seconds to a date. Returns a new Date.
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Add days to a date. Returns a new Date.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Check if a date is in the past.
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future.
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}
