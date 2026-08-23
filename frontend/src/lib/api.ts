/**
 * Thin client for the `/api/proxy/*` routes.
 *
 * Its job is to make backend failures *visible*. Every screen used to do
 * `await res.json()` and either ignore `res.ok` or show a generic message, so
 * a declined payment, a sold-out item or an expired session all looked the
 * same to the customer (or looked like nothing at all).
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Machine-readable code from the backend, e.g. `OUT_OF_STOCK`. */
    readonly code: string | null = null,
    readonly details: unknown = null
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The customer needs to sign in again. */
  get isAuthError() {
    return this.status === 401;
  }
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** Messages for failures the backend never got to answer. */
function networkMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'The request timed out. Please check your connection and try again.';
  }
  return 'We could not reach the store. Please check your connection and try again.';
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Sent as `x-idempotency-key` so retries cannot create duplicate orders. */
  idempotencyKey?: string;
  timeoutMs?: number;
}

export async function apiFetch<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, idempotencyKey, timeoutMs = 30_000, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set('content-type', 'application/json');
  if (idempotencyKey) requestHeaders.set('x-idempotency-key', idempotencyKey);

  let response: Response;
  try {
    response = await fetch(`/api/proxy/${path.replace(/^\/+/, '')}`, {
      ...rest,
      headers: requestHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiError(networkMessage(err), 0, 'NETWORK_ERROR');
  }

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // Non-JSON response (an HTML error page, say) — keep the raw text out of
      // the UI and fall back to a status-based message.
    }
  }

  if (!response.ok) {
    throw new ApiError(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : statusMessage(response.status),
      response.status,
      typeof payload?.code === 'string' ? payload.code : null,
      payload?.details ?? null
    );
  }

  return payload as T;
}

function statusMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'That conflicts with the current state of your order. Refresh and try again.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    case 503:
      return 'The store is temporarily unavailable. Please try again shortly.';
    default:
      return status >= 500 ? 'The store hit an unexpected error. Please try again.' : GENERIC_MESSAGE;
  }
}

/** Extracts a displayable message from anything thrown by `apiFetch`. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return GENERIC_MESSAGE;
}
