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
