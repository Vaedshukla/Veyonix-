// ============================================================
// Veyonix API Types — Response Envelopes & Pagination
// RFC 7807 Problem Details compliant
// ============================================================

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta | null;
}

export interface ApiError {
  success: false;
  error: {
    code: string;          // e.g. AUTH_INVALID_CREDENTIALS
    message: string;       // Human-readable
    details?: unknown[];   // Validation errors
    requestId?: string;    // Trace ID
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// RFC 7807 Problem Details
export interface ProblemDetails {
  type: string;        // URI reference
  title: string;
  status: number;
  detail: string;
  instance: string;    // Path
  errors?: ValidationError[];
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Cursor-based pagination
export interface PaginationMeta {
  total: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface PaginationQuery {
  limit?: number;       // Default: 20, Max: 100
  cursor?: string;      // Opaque cursor
  sort?: string;        // e.g., 'createdAt:desc,name:asc'
  filter?: Record<string, string>;
  expand?: string[];    // e.g., ['organization', 'devices']
  fields?: string[];    // Sparse fieldsets
}

export interface CursorPage<T> {
  items: T[];
  meta: PaginationMeta;
}
