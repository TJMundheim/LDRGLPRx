/**
 * Svelte 5 reactive currentUser store.
 * Hydrates from getCurrentUser() on module load if an idToken is present.
 */

import { getCurrentUser, getIdToken } from './cognito.js';
import type { CognitoUser } from './cognito.js';

// Svelte 5 rune-based store via a module-level $state object.
const _state = $state<{ user: CognitoUser | null }>({
  user: getIdToken() ? getCurrentUser() : null,
});

/** Reactive reference to the current signed-in user, or null. */
export const currentUser = {
  get value(): CognitoUser | null {
    return _state.user;
  },
};

/** Set the current user (called after successful code submission). */
export function setUser(user: CognitoUser): void {
  _state.user = user;
}

/** Clear the current user (called on sign-out). */
export function clearUser(): void {
  _state.user = null;
}
