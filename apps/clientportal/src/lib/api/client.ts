/**
 * Minimal AppSync GraphQL client.
 *
 * - No Amplify dependency.
 * - Reads the endpoint from VITE_APPSYNC_URL.
 * - Attaches Authorization: <idToken> header.
 * - Throws a descriptive error when the GraphQL response contains errors.
 * - On 401/Unauthorized, transparently refreshes the Cognito ID token via the
 *   stored refresh token and retries the request once. If the refresh itself
 *   fails (refresh token expired or revoked), the user is signed out and the
 *   original error is propagated so the UI can route them to sign-in.
 */

import { getIdToken, refreshIdToken, signOut } from '../auth/cognito.js';

export interface GraphQLRequest<V = Record<string, unknown>> {
  query: string;
  variables?: V;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; errorType?: string; [key: string]: unknown }>;
}

export interface ClientOptions {
  /** Override the token getter — useful in tests or SSR contexts. */
  getToken?: () => string | null;
  /** Override the AppSync URL — useful in tests. */
  url?: string;
}

/**
 * Detects an AppSync auth-failure response. AppSync returns these as:
 *   - HTTP 401 with no JSON body, OR
 *   - HTTP 200 with `errors[].errorType` containing 'Unauthorized' /
 *     'UnauthorizedException' (the token-expired path)
 */
function isUnauthorized(resp: Response, json: GraphQLResponse<unknown> | null): boolean {
  if (resp.status === 401) return true;
  if (!json?.errors) return false;
  return json.errors.some((e) => {
    const t = (e.errorType as string | undefined)?.toLowerCase() ?? '';
    const m = (e.message as string | undefined)?.toLowerCase() ?? '';
    return t.includes('unauthorized') || m.includes('unauthorized') || m.includes('token has expired') || m.includes('token is expired');
  });
}

/**
 * Creates a typed AppSync fetch client.
 *
 * @example
 * const client = appsyncClient();
 * const data = await client<{ getMyProfile: UserProfile }>({ query: `...` });
 */
export function appsyncClient(options: ClientOptions = {}) {
  const resolveToken = options.getToken ?? getIdToken;
  const resolveUrl = () =>
    options.url ?? (import.meta as unknown as { env: Record<string, string> }).env?.VITE_APPSYNC_URL ?? '';

  return async function request<T = unknown>(
    gql: GraphQLRequest,
  ): Promise<T> {
    const url = resolveUrl();
    if (!url) throw new Error('VITE_APPSYNC_URL is not set');

    const initialToken = resolveToken();
    if (!initialToken) throw new Error('No Cognito ID token available — user not signed in');

    async function doFetch(token: string): Promise<{ resp: Response; json: GraphQLResponse<T> | null }> {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          query: gql.query,
          variables: gql.variables,
        }),
      });
      let json: GraphQLResponse<T> | null = null;
      try { json = await resp.clone().json() as GraphQLResponse<T>; } catch { json = null; }
      return { resp, json };
    }

    let { resp, json } = await doFetch(initialToken);

    // If unauthorized, try refreshing the ID token and retrying once.
    if (isUnauthorized(resp, json)) {
      let newToken: string | null = null;
      try {
        newToken = await refreshIdToken();
      } catch (refreshErr) {
        // Refresh token itself is dead — sign the user out so the UI gates
        // back to the sign-in flow on the next render.
        try { signOut(); } catch { /* ignore */ }
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (newToken) {
        ({ resp, json } = await doFetch(newToken));
      }
    }

    if (!resp.ok) {
      throw new Error(`AppSync HTTP error ${resp.status}: ${resp.statusText}`);
    }

    if (!json) {
      throw new Error('AppSync returned a non-JSON response');
    }

    if (json.errors && json.errors.length > 0) {
      const messages = json.errors.map((e) => e.message).join('; ');
      throw new Error(`GraphQL error(s): ${messages}`);
    }

    return json.data as T;
  };
}

/** Default singleton client — reads env at call time so tests can stub fetch. */
export const gql = appsyncClient();
