/**
 * HTTP client — fetch wrapper with JWT injection and single-flight silent refresh.
 *
 * Kept from the previous implementation (it was correct) with three changes:
 *  - HttpError now carries `details`, so a 409 CLINICAL_SAFETY_VIOLATION can be
 *    rendered with the specific prohibited terms the backend found.
 *  - Blob support, for streaming the report PDF.
 *  - A network-failure path that is distinguishable from an HTTP error, because
 *    "you are offline" and "the server said no" need different UI.
 */
import type { ApiError } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export { API_BASE };

let refreshInFlight: Promise<boolean> | null = null;

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'HttpError';
  }

  /** True when the request never reached the server. */
  get isOffline() { return this.status === 0; }
}

function getTokens() {
  return {
    access: localStorage.getItem('rg_access_token'),
    refresh: localStorage.getItem('rg_refresh_token'),
  };
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('rg_access_token', access);
  localStorage.setItem('rg_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('rg_access_token');
  localStorage.removeItem('rg_refresh_token');
  localStorage.removeItem('rg_user');
}

async function refreshToken(): Promise<boolean> {
  const { refresh } = getTokens();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) { clearTokens(); return false; }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    // Network failure during refresh: keep the tokens. The device may simply be
    // offline, and discarding a valid refresh token would force a login the
    // technician cannot complete without connectivity.
    return false;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
    if (!res.ok) throw new HttpError(res.status, 'UNKNOWN', res.statusText);
    return (await res.blob()) as unknown as T;
  }

  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) {
      const err = json as ApiError;
      throw new HttpError(
        res.status,
        err.error?.code || 'UNKNOWN',
        err.error?.message || res.statusText,
        err.error?.details,
      );
    }
    return json as T;
  }

  if (!res.ok) throw new HttpError(res.status, 'UNKNOWN', res.statusText);
  return (await res.text()) as unknown as T;
}

interface RequestOptions {
  isFormData?: boolean;
  noAuth?: boolean;
  accept?: string;
  idempotencyKey?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { access } = getTokens();

  const headers: Record<string, string> = {};
  if (!opts?.noAuth && access) headers.Authorization = `Bearer ${access}`;
  if (!opts?.isFormData) headers['Content-Type'] = 'application/json';
  if (opts?.accept) headers.Accept = opts.accept;
  // Guards against a double-tap on "Save" over a slow rural link.
  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let reqBody: BodyInit | undefined;
  if (body instanceof FormData) reqBody = body;
  else if (body !== undefined) reqBody = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: reqBody });
  } catch {
    throw new HttpError(0, 'NETWORK_ERROR', 'Cannot reach the edge server. Work is saved locally and will sync when the connection returns.');
  }

  if (res.status === 401 && !opts?.noAuth) {
    if (!refreshInFlight) {
      refreshInFlight = refreshToken().finally(() => { refreshInFlight = null; });
    }
    const refreshed = await refreshInFlight;
    if (refreshed) {
      headers.Authorization = `Bearer ${getTokens().access}`;
      try {
        res = await fetch(url, { method, headers, body: reqBody });
      } catch {
        throw new HttpError(0, 'NETWORK_ERROR', 'Cannot reach the edge server.');
      }
    } else {
      clearTokens();
      window.dispatchEvent(new CustomEvent('rg:session-expired'));
      throw new HttpError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again to continue.');
    }
  }

  return parseResponse<T>(res);
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, body, opts),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData, opts?: RequestOptions) =>
    request<T>('POST', path, formData, { ...opts, isFormData: true }),
  publicGet: <T>(path: string) => request<T>('GET', path, undefined, { noAuth: true }),
  publicPost: <T>(path: string, body?: unknown) => request<T>('POST', path, body, { noAuth: true }),
};

/** Builds a query string, omitting undefined/empty values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}
