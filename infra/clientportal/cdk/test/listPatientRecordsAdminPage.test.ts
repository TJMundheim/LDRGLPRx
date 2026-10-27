import { readFileSync } from 'fs';
import { join } from 'path';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it, expect } from 'vitest';
import { ApiStack } from '../lib/api-stack';

// The resolver is APPSYNC_JS (imports @aws-appsync/utils, not installed here), so load it
// with a stubbed `util` and strip the module syntax.
function load() {
  const src = readFileSync(join(__dirname, '../resolvers/listPatientRecordsAdminPage.js'), 'utf8')
    .replace(/^import .*$/m, '')
    .replace(/^export function/gm, 'function');
  const util = {
    unauthorized: () => { throw new Error('unauthorized'); },
    error: (m: string) => { throw new Error(m); },
  };
  return new Function('util', `${src}; return { request, response };`)(util) as {
    request: (ctx: any) => any;
    response: (ctx: any) => any;
  };
}
const admin = { identity: { groups: ['Admins'] }, args: {} };

describe('listPatientRecordsAdminPage resolver', () => {
  it('rejects non-admins', () => {
    expect(() => load().request({ identity: { groups: [] }, args: {} })).toThrow('unauthorized');
  });
  it('accepts admins via cognito:groups claim', () => {
    const req = load().request({ identity: { claims: { 'cognito:groups': ['Admins'] } }, args: {} });
    expect(req.operation).toBe('Scan');
  });
  it('scans sk = record with a 1000-item page and forwards nextToken', () => {
    const req = load().request({ ...admin, args: { nextToken: 'tok' } });
    expect(req.operation).toBe('Scan');
    expect(req.limit).toBe(1000);
    expect(req.nextToken).toBe('tok');
    expect(req.filter.expression).toBe('#sk = :record');
    expect(req.filter.expressionValues).toEqual({ ':record': { S: 'record' } });
  });
  it('honours an explicit limit', () => {
    expect(load().request({ ...admin, args: { limit: 200 } }).limit).toBe(200);
  });
  it('returns { items, nextToken } with empty nested arrays', () => {
    const out = load().response({ result: { items: [{ contactId: 'c1' }], nextToken: 'next' } });
    expect(out.nextToken).toBe('next');
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toMatchObject({ contactId: 'c1', encounters: [], audit: [], briefs: [], plans: [] });
  });
  it('returns a null/undefined nextToken on the last page', () => {
    const out = load().response({ result: { items: [] } });
    expect(out.items).toEqual([]);
    expect(out.nextToken ?? null).toBeNull();
  });
});

describe('listPatientRecordsAdminPage wiring', () => {
  it('has a Query resolver and keeps the legacy listPatientRecordsAdmin one', () => {
    const t = Template.fromStack(new ApiStack(new App(), 'TestApiStackPage', {}));
    t.hasResourceProperties('AWS::AppSync::Resolver', { TypeName: 'Query', FieldName: 'listPatientRecordsAdminPage' });
    t.hasResourceProperties('AWS::AppSync::Resolver', { TypeName: 'Query', FieldName: 'listPatientRecordsAdmin' });
  });
  it('schema declares the page query as Admins-only', () => {
    const sdl = readFileSync(join(__dirname, '../../appsync/schema.graphql'), 'utf8');
    expect(sdl).toMatch(/listPatientRecordsAdminPage\(limit: Int, nextToken: String\): PatientRecordAdminPage!\s*\n\s*@aws_auth\(cognito_groups: \["Admins"\]\)/);
    expect(sdl).toMatch(/type PatientRecordAdminPage \{\s*items: \[PatientRecordAdmin!\]!\s*nextToken: String\s*\}/);
  });
});
