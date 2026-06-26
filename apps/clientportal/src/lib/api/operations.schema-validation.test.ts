/**
 * Schema-validation guard for the EMR admin operations.
 *
 * Why this exists: the EMR admin queries failed TWICE in ways unit tests with a
 * mocked client could not catch — once a wrong mutation argument shape, once a
 * missing sub-selection on the `audit` field. Both are GraphQL *document vs
 * schema* mismatches, invisible until a real request hits AppSync.
 *
 * This test captures the EXACT query string each wrapper sends and validates it
 * against the real `infra/clientportal/appsync/schema.graphql` SDL using
 * graphql-js. It would have caught both prior bugs. No network, no AWS.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildSchema, parse, validate, type GraphQLSchema } from 'graphql';

// ─── Capture the query strings the wrappers send ──────────────────────────────
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }));

vi.mock('./client.js', () => ({
  appsyncClient: vi.fn(() => mockRequest),
  gql: mockRequest,
}));

import {
  listPatientRecordsAdmin,
  getPatientRecordAdmin,
  updateEncounterStateAdmin,
} from './operations.js';

// ─── Build the schema from the real SDL + AppSync preamble ─────────────────────
// AppSync provides these scalars/directives implicitly; graphql-js needs them declared.
const AWS_PREAMBLE = `
scalar AWSDate
scalar AWSDateTime
scalar AWSEmail
scalar AWSPhone
scalar AWSURL
scalar AWSTime
scalar AWSTimestamp
scalar AWSJSON
scalar AWSIPAddress
directive @aws_auth(cognito_groups: [String]) on FIELD_DEFINITION | OBJECT
directive @aws_cognito_user_pools(cognito_groups: [String]) on FIELD_DEFINITION | OBJECT
directive @aws_iam on FIELD_DEFINITION | OBJECT
directive @aws_api_key on FIELD_DEFINITION | OBJECT
directive @aws_oidc on FIELD_DEFINITION | OBJECT
directive @aws_subscribe(mutations: [String]) on FIELD_DEFINITION
`;

function loadSchema(): GraphQLSchema {
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../../infra/clientportal/appsync/schema.graphql',
  );
  const sdl = readFileSync(schemaPath, 'utf8');
  return buildSchema(AWS_PREAMBLE + '\n' + sdl, { assumeValidSDL: true });
}

async function captureQuery(fn: () => Promise<unknown>): Promise<string> {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({}); // shape doesn't matter; we only need the sent query
  try {
    await fn();
  } catch {
    /* parsing the empty response may throw — irrelevant; the query was already captured */
  }
  const call = mockRequest.mock.calls[0]?.[0];
  if (!call?.query) throw new Error('wrapper did not call the client with a query');
  return call.query as string;
}

describe('EMR admin operations validate against the deployed AppSync schema', () => {
  let schema: GraphQLSchema;
  beforeEach(() => {
    schema = loadSchema();
  });

  it('listPatientRecordsAdmin is a valid document', async () => {
    const query = await captureQuery(() => listPatientRecordsAdmin(50));
    const errors = validate(schema, parse(query));
    expect(errors.map((e) => e.message)).toEqual([]);
  });

  it('getPatientRecordAdmin is a valid document', async () => {
    const query = await captureQuery(() => getPatientRecordAdmin('contact-1'));
    const errors = validate(schema, parse(query));
    expect(errors.map((e) => e.message)).toEqual([]);
  });

  it('updateEncounterStateAdmin is a valid document', async () => {
    const query = await captureQuery(() =>
      updateEncounterStateAdmin({
        contactId: 'c1',
        encounterId: 'e1',
        toState: 'coordinator-reviewed',
      }),
    );
    const errors = validate(schema, parse(query));
    expect(errors.map((e) => e.message)).toEqual([]);
  });

  it('sanity: the validator actually rejects a known-bad document', () => {
    // `audit` is an object list and REQUIRES a sub-selection — the exact bug we hit.
    const bad = `query { listPatientRecordsAdmin(limit: 1) { contactId audit } }`;
    const errors = validate(schema, parse(bad));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/audit/i);
  });
});
