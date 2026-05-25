/**
 * Auth integration — delegates to the Cognito passwordless (CUSTOM_AUTH) module.
 * API surface is kept compatible with previous stub.
 */

import {
  requestEmailCode,
  submitEmailCode,
  getCurrentUser as cognitoGetCurrentUser,
  signOut as cognitoSignOut,
  getIdToken,
} from '../auth/cognito.js';

export { requestEmailCode, submitEmailCode, getIdToken };

export interface User {
  id: string;
  email: string;
  groups: string[];
  firstName?: string;
  lastName?: string;
  /** Derived from Cognito groups: first matching group is used, falls back to 'patient'. */
  role: 'patient' | 'clinician' | 'admin';
}

function toUser(raw: { sub: string; email: string; groups: string[]; firstName?: string; lastName?: string }): User {
  const roleMap: Record<string, User['role']> = {
    admin: 'admin',
    clinician: 'clinician',
    patient: 'patient',
  };
  const role: User['role'] =
    raw.groups.map((g) => roleMap[g]).find(Boolean) ?? 'patient';
  return { id: raw.sub, email: raw.email, groups: raw.groups, role, firstName: raw.firstName, lastName: raw.lastName };
}

/** Signs out the current user. */
export async function signOut(): Promise<void> {
  cognitoSignOut();
}

/** Returns the current user, if any. */
export async function currentUser(): Promise<User | null> {
  const raw = cognitoGetCurrentUser();
  if (!raw) return null;
  return toUser(raw);
}

/** Whether there is a signed-in user. */
export async function isAuthenticated(): Promise<boolean> {
  return cognitoGetCurrentUser() !== null;
}
