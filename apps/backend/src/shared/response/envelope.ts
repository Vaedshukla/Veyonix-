import type { ApiSuccess, PaginationMeta, CursorPage } from '@veyonix/shared-types';

/** Wrap a successful single-item response */
export function ok<T>(data: T, meta?: PaginationMeta | null): ApiSuccess<T> {
  return {
    success: true,
    data,
    meta: meta ?? null,
  };
}

/** Wrap a successful paginated response */
export function paginated<T>(page: CursorPage<T>): ApiSuccess<T[]> {
  return {
    success: true,
    data: page.items,
    meta: page.meta,
  };
}

/** Wrap a void success (e.g., DELETE) */
export function noContent(): ApiSuccess<null> {
  return {
    success: true,
    data: null,
  };
}
