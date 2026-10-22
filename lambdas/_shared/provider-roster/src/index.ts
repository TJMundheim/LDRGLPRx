// Contract stub — implementation lands in P1 (docs/plan/provider-roster-2026-10-22.md).
export interface Provider { id: string; name: string; credentials: string; inbox: string; default?: boolean }
export declare function loadRoster(ssm?: unknown): Promise<Provider[]>;
export declare function resolveProvider(roster: Provider[], id?: string): Provider;
export declare function validateRoster(json: unknown): Provider[];
export declare function resetRosterCache(): void;
