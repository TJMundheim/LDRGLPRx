/** Shared types for the Nudge system. */

export interface NudgeItem {
  id: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  autoDismissMs?: number;
  tone?: 'info' | 'celebrate' | 'reminder';
}
