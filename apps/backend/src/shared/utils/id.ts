import { uuidv7 } from 'uuidv7';

/**
 * Generate a UUID v7 identifier.
 *
 * UUID v7 is time-ordered, which gives better database index locality
 * than random UUID v4. This means new rows cluster together on the
 * B-tree index, reducing page splits and improving insert performance
 * at scale.
 */
export function generateId(): string {
  return uuidv7();
}

/**
 * Check if a string is a valid UUID (v4 or v7).
 */
export function isValidId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
