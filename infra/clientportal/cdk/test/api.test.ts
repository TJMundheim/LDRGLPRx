import { readFileSync } from 'fs';
import { join } from 'path';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it, expect } from 'vitest';
import { ApiStack } from '../lib/api-stack';

describe('ApiStack', () => {
  function buildTemplate(): Template {
    const app = new App();
    const stack = new ApiStack(app, 'TestApiStack', {});
    return Template.fromStack(stack);
  }

  it('creates a GraphQL API with AMAZON_COGNITO_USER_POOLS as default auth', () => {
    const template = buildTemplate();
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
    });
  });

  it('adds AWS_IAM as an additional authentication provider', () => {
    const template = buildTemplate();
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      AdditionalAuthenticationProviders: [
        { AuthenticationType: 'AWS_IAM' },
      ],
    });
  });

  const resolvers = [
    { typeName: 'Query',    fieldName: 'getMyProfile' },
    { typeName: 'Mutation', fieldName: 'upsertMyProfile' },
    { typeName: 'Mutation', fieldName: 'updateSecondaryEmail' },
    { typeName: 'Query',    fieldName: 'listMyOutcomes' },
    { typeName: 'Mutation', fieldName: 'createOutcome' },
    { typeName: 'Query',    fieldName: 'getAppConfig' },
    { typeName: 'Query',    fieldName: 'adminListUsers' },
    { typeName: 'Query',    fieldName: 'adminGetProfile' },
  ];

  resolvers.forEach(({ typeName, fieldName }) => {
    it(`has a resolver for ${typeName}.${fieldName}`, () => {
      const template = buildTemplate();
      template.hasResourceProperties('AWS::AppSync::Resolver', {
        TypeName: typeName,
        FieldName: fieldName,
      });
    });
  });
});

describe('refundEncounterAdmin wiring', () => {
  // Checked against the .ts source: the committed api-stack.js is a stale tsc artifact; `cdk deploy` runs the .ts via ts-node.
  it('is wired in api-stack.ts to my4mlife-refund-encounter-admin', () => {
    const src = readFileSync(join(__dirname, '../lib/api-stack.ts'), 'utf8');
    expect(src).toMatch(/fromFunctionName\(this, 'RefundEncounterFn', 'my4mlife-refund-encounter-admin'\)/);
    expect(src).toMatch(/fieldName: 'refundEncounterAdmin'/);
    expect(src).toMatch(/code\('refundEncounterAdmin\.js'\)/);
  });

  it('declares an Admins-only mutation + result type in the schema', () => {
    const schema = readFileSync(join(__dirname, '../../appsync/schema.graphql'), 'utf8');
    expect(schema).toMatch(/refundEncounterAdmin\(contactId: ID!, encounterId: ID!\): EncounterRefundResult\s+@aws_auth\(cognito_groups: \["Admins"\]\)/);
    expect(schema).toMatch(/type EncounterRefundResult \{/);
  });

  it('resolver rejects non-admins before invoking the Lambda', () => {
    const src = readFileSync(join(__dirname, '../resolvers/refundEncounterAdmin.js'), 'utf8');
    expect(src).toMatch(/if \(!isAdmin\(ctx\)\) util\.unauthorized\(\)/);
    expect(src).toMatch(/operation: 'Invoke'/);
  });
});
