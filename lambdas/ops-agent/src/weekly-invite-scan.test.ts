import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// The weekly Zoom invite scan lives in the intent text deployed by infra/deploy.sh (WEEKLY_INPUT).
const deploy = readFileSync(join(__dirname, '../infra/deploy.sh'), 'utf8');
const weekly = deploy.split('\n').find((l) => l.startsWith('WEEKLY_INPUT=')) ?? '';

describe('weekly Zoom invite scan intent', () => {
  it('selects Protégés by stage OR protegeSince and excludes banned contacts', () => {
    expect(weekly).toContain('(#ls = :protege OR attribute_exists(#ps)) AND #ls <> :banned');
    expect(weekly).toContain('{\\"#ls\\":\\"lifecycleStage\\",\\"#ps\\":\\"protegeSince\\"}');
    expect(weekly).toContain('{\\":protege\\":\\"protege\\",\\":banned\\":\\"banned\\"}');
  });
  it('no longer scans on lifecycleStage=protege alone', () => {
    expect(weekly).not.toContain("lifecycleStage='\\''protege'\\''");
  });
});
