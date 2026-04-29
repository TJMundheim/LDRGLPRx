/**
 * Minimal AppSync GraphQL client.
 *
 * - No Amplify dependency.
 * - Reads the endpoint from VITE_APPSYNC_URL.
 * - Attaches Authorization: <idToken> header.
 * - Throws a descriptive error when the GraphQL response contains errors.
 */

import { getIdToken } from '../auth/cognito.js';

export interface GraphQLRequest<V = Record<string, unknown>> {
  query: string;
  variables?: V;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; [key: string]: unknown }>;
}

export interface ClientOptions {
  /** Override the token getter — useful in tests or SSR contexts. */
  getToken?: () => string | null;
  /** Override the AppSync URL — useful in tests. */
  url?: string;
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

    const token = resolveToken();
    if (!token) throw new Error('No Cognito ID token available — user not signed in');

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

    if (!resp.ok) {
      throw new Error(`AppSync HTTP error ${resp.status}: ${resp.statusText}`);
    }

    const json = (await resp.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      const messages = json.errors.map((e) => e.message).join('; ');
      throw new Error(`GraphQL error(s): ${messages}`);
    }

    return json.data as T;
  };
}

/** Default singleton client — reads env at call time so tests can stub fetch. */
export const gql = appsyncClient();
