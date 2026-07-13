import type { PaginationMeta, CursorPage } from '@veyonix/shared-types';

export interface CursorPaginationOptions {
  limit: number;
  cursor?: string;
}

/**
 * Encode a cursor from a field value.
 * The cursor is opaque to the client — base64 encoded JSON.
 */
export function encodeCursor(value: string | Date | number): string {
  const str = value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(str).toString('base64url');
}

/**
 * Decode a cursor into a string for database comparison.
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/**
 * Build a CursorPage from raw results.
 * Requests one extra item to determine if there's a next page.
 */
export function buildCursorPage<T>(
  items: T[],
  total: number,
  limit: number,
  cursor: string | undefined,
  getCursorValue: (item: T) => string | Date | number,
): CursorPage<T> {
  const hasNextPage = items.length > limit;
  const paginatedItems = hasNextPage ? items.slice(0, limit) : items;

  const lastItem = paginatedItems[paginatedItems.length - 1];
  const nextCursor =
    hasNextPage && lastItem ? encodeCursor(getCursorValue(lastItem)) : null;

  const meta: PaginationMeta = {
    total,
    limit,
    hasNextPage,
    hasPreviousPage: cursor !== undefined,
    nextCursor,
    previousCursor: cursor ?? null,
  };

  return { items: paginatedItems, meta };
}

/**
 * Parse and validate pagination query params with safe defaults.
 */
export function parsePaginationQuery(query: {
  limit?: unknown;
  cursor?: unknown;
}): CursorPaginationOptions {
  const limit = Math.min(
    Math.max(1, Number(query.limit) || 20),
    100, // max 100 items per page
  );
  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;
  return { limit, cursor };
}
