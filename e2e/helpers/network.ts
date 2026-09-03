import type { Page, Response } from "@playwright/test";

/** Local ephemeral API is usually &lt;1s — fail fast on miss. */
export const API_TIMEOUT = 5_000;
/** Sample-DB round trips (ping, short queries). */
export const API_DB_TIMEOUT = 15_000;
/** Object-form DDL execute / drop. */
export const API_DDL_TIMEOUT = 60_000;

export type ApiMatch = {
  /** Pathname regex matched against `new URL(response.url()).pathname`. */
  path: RegExp;
  method?: string | string[];
  status?: number;
};

/**
 * Precise `/api/...` path matchers — prefer these over substring `includes`.
 * Trailing slash / query string are allowed; sibling routes are not.
 */
export const apiRoute = {
  connectionsList: {
    path: /^\/api\/connections\/?$/,
    method: "GET",
    status: 200,
  },
  connectionsCreate: {
    path: /^\/api\/connections\/?$/,
    method: "POST",
    status: 200,
  },
  connectionsUpdate: {
    path: /^\/api\/connections\/\d+\/?$/,
    method: "PATCH",
    status: 200,
  },
  /** Create (POST /) or update (PATCH /:id) — not ping/credentials. */
  connectionsSave: {
    path: /^\/api\/connections(?:\/\d+)?\/?$/,
    method: ["POST", "PATCH"],
    status: 200,
  },
  connectionsPing: {
    path: /^\/api\/connections\/ping\/?$/,
    method: "POST",
  },
  connectionCredentials: {
    path: /^\/api\/connections\/\d+\/credentials\/?$/,
    method: "POST",
    status: 200,
  },
  queryRaw: {
    path: /^\/api\/query\/raw\/?$/,
    method: "POST",
    status: 200,
  },
  queryAutocomplete: {
    path: /^\/api\/query\/autocomplete\/?$/,
    method: "GET",
    status: 200,
  },
  queryRun: {
    path: /^\/api\/query\/run\/?$/,
    method: "POST",
    status: 200,
  },
  /** Data browser (`/run`) or SQL editor (`/raw`) fetch. */
  queryFetch: {
    path: /^\/api\/query\/(raw|run)\/?$/,
    method: "POST",
    status: 200,
  },
  queryUpdate: {
    path: /^\/api\/query\/update\/?$/,
    method: "POST",
    status: 200,
  },
  exportStart: {
    path: /^\/api\/export\/?$/,
    method: "POST",
    status: 200,
  },
  importStart: {
    path: /^\/api\/import\/?$/,
    method: "POST",
    status: 200,
  },
  jobDetail: {
    path: /^\/api\/jobs\/\d+\/?$/,
    method: "GET",
  },
  savedList: {
    path: /^\/api\/saved\/?$/,
    method: "GET",
    status: 200,
  },
  savedCreate: {
    path: /^\/api\/saved\/?$/,
    method: "POST",
    status: 200,
  },
  historiesList: {
    path: /^\/api\/histories\/?$/,
    method: "GET",
    status: 200,
  },
  objectPreview: {
    path: /\/api\/tree\/[^/]+\/tabs\/[^/]+\/fields\/object\/preview\/?$/,
  },
  objectExecute: {
    path: /\/api\/tree\/[^/]+\/tabs\/[^/]+\/fields\/object\/?$/,
  },
  schemaDiagram: {
    path: /^\/api\/schema\/diagram\/?$/,
    method: "GET",
    status: 200,
  },
  safeModePassword: {
    path: /^\/api\/safe-mode\/password\/?$/,
    method: ["GET", "POST", "PATCH"],
  },
  safeModeVerify: {
    path: /^\/api\/safe-mode\/verify\/?$/,
    method: "POST",
    status: 200,
  },
} as const satisfies Record<string, ApiMatch>;

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function matchApiResponse(response: Response, match: ApiMatch): boolean {
  if (!match.path.test(pathnameOf(response.url()))) {
    return false;
  }
  if (match.method !== undefined) {
    const methods = Array.isArray(match.method) ? match.method : [match.method];
    if (!methods.includes(response.request().method())) {
      return false;
    }
  }
  if (match.status !== undefined && response.status() !== match.status) {
    return false;
  }
  return true;
}

/**
 * Register a response listener. Always call this BEFORE the click/action that
 * triggers the request — otherwise the response can finish first and you wait
 * the full timeout for nothing.
 */
export function pendingResponse(
  page: Page,
  match: ApiMatch,
  timeout: number = API_TIMEOUT,
): Promise<Response> {
  return page.waitForResponse((response) => matchApiResponse(response, match), {
    timeout,
  });
}

/**
 * Correct order: start listening → run action → await matching response.
 * Prefer asserting user-visible UI after this when the outcome is on screen;
 * use network waits when you need status/body or there is no stable UI signal.
 */
export async function waitForResponseDuring(
  page: Page,
  match: ApiMatch,
  action: () => Promise<void>,
  timeout: number = API_TIMEOUT,
): Promise<Response> {
  const pending = pendingResponse(page, match, timeout);
  await action();
  return pending;
}
