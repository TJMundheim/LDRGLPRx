/**
 * Auth integration — stub. Not implemented.
 *
 * Expected: Supabase Auth (magic link + passkey). TODO: implement alongside storage
 * migration to Supabase.
 */

export interface User {
  id: string;
  email: string;
  cohortId?: string;
}

/** Initiates a sign-in flow (magic link / OAuth). */
export async function signIn(_email: string): Promise<void> {
  throw new Error('Not implemented: auth provider pending');
}

/** Signs out the current user. */
export async function signOut(): Promise<void> {
  throw new Error('Not implemented: auth provider pending');
}

/** Returns the current user, if any. */
export async function currentUser(): Promise<User | null> {
  // During beta, return a local anonymous user so the app is usable offline.
  return { id: 'local-user', email: 'local@clientportal' };
}

/** Whether there is a signed-in user. */
export async function isAuthenticated(): Promise<boolean> {
  return (await currentUser()) !== null;
}
