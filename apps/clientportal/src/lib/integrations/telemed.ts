/**
 * Telemed integration — stub. Not implemented.
 *
 * Vendor candidates under evaluation: Healthie, Spruce, or direct-iframe embed.
 * TODO: implement once provider selected. See roadmap / HANDOFF.md.
 */

export interface AppointmentRequest {
  userId: string;
  preferredDate: string; // ISO
  reason: string;
  cohortId?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  scheduledFor: string;
  providerName: string;
  joinUrl?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

/** Books an intake appointment with the telemed provider. */
export async function bookAppointment(_req: AppointmentRequest): Promise<Appointment> {
  throw new Error('Not implemented: telemed provider pending');
}

/** Returns upcoming appointments for a user. */
export async function getUpcomingAppointments(_userId: string): Promise<Appointment[]> {
  throw new Error('Not implemented: telemed provider pending');
}
