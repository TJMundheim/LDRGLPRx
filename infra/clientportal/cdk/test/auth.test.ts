import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it, expect, beforeAll } from 'vitest';
// TDD: auth-stack does not exist yet — this import will cause a red failure until IMPL task
import { AuthStack } from '../lib/auth-stack';

let template: Template;

beforeAll(() => {
  const app = new App();
  const stack = new AuthStack(app, 'TestAuthStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  template = Template.fromStack(stack);
});

// ─── UserPool ────────────────────────────────────────────────────────────────

describe('Cognito UserPool', () => {
  it('uses email as username attribute', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
    });
  });

  it('auto-verifies email', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AutoVerifiedAttributes: ['email'],
    });
  });

  it('schema contains only an email attribute (no name, phone, or custom profile attrs)', () => {
    const pools = template.findResources('AWS::Cognito::UserPool');
    const poolKeys = Object.keys(pools);
    expect(poolKeys.length).toBeGreaterThan(0);

    for (const key of poolKeys) {
      const schema: Array<{ Name: string }> = pools[key].Properties?.Schema ?? [];
      const names = schema.map((s) => s.Name);

      // Must include email
      expect(names).toContain('email');

      // Must NOT include name, phone_number, or custom: prefixed profile attrs
      const forbidden = names.filter(
        (n) => n === 'name' || n === 'phone_number' || n.startsWith('custom:'),
      );
      expect(forbidden).toEqual([]);
    }
  });
});

// ─── UserPoolClient ──────────────────────────────────────────────────────────

describe('Cognito UserPoolClient', () => {
  it('includes ALLOW_CUSTOM_AUTH in ExplicitAuthFlows', () => {
    const clients = template.findResources('AWS::Cognito::UserPoolClient');
    const clientKeys = Object.keys(clients);
    expect(clientKeys.length).toBeGreaterThan(0);

    for (const key of clientKeys) {
      const flows: string[] = clients[key].Properties?.ExplicitAuthFlows ?? [];
      expect(flows).toContain('ALLOW_CUSTOM_AUTH');
    }
  });

  it('does NOT include ALLOW_USER_PASSWORD_AUTH in ExplicitAuthFlows', () => {
    const clients = template.findResources('AWS::Cognito::UserPoolClient');
    for (const key of Object.keys(clients)) {
      const flows: string[] = clients[key].Properties?.ExplicitAuthFlows ?? [];
      expect(flows).not.toContain('ALLOW_USER_PASSWORD_AUTH');
    }
  });

  it('does NOT include ALLOW_USER_SRP_AUTH in ExplicitAuthFlows', () => {
    const clients = template.findResources('AWS::Cognito::UserPoolClient');
    for (const key of Object.keys(clients)) {
      const flows: string[] = clients[key].Properties?.ExplicitAuthFlows ?? [];
      expect(flows).not.toContain('ALLOW_USER_SRP_AUTH');
    }
  });
});

// ─── Lambda Triggers ─────────────────────────────────────────────────────────

describe('Cognito Lambda triggers', () => {
  it('has a DefineAuthChallenge trigger attached', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        DefineAuthChallenge: expect.anything(),
      },
    });
  });

  it('has a CreateAuthChallenge trigger attached', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        CreateAuthChallenge: expect.anything(),
      },
    });
  });

  it('has a VerifyAuthChallengeResponse trigger attached', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        VerifyAuthChallengeResponse: expect.anything(),
      },
    });
  });

  it('has a PostConfirmation trigger attached', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        PostConfirmation: expect.anything(),
      },
    });
  });

  it('has a PostAuthentication trigger attached', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      LambdaConfig: {
        PostAuthentication: expect.anything(),
      },
    });
  });
});

// ─── IdentityPool ────────────────────────────────────────────────────────────

describe('Cognito IdentityPool', () => {
  it('has an AWS::Cognito::IdentityPool resource', () => {
    template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
  });
});

// ─── Admins Group ────────────────────────────────────────────────────────────

describe('Cognito Admins group', () => {
  it('has a UserPoolGroup named Admins', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
      GroupName: 'Admins',
    });
  });
});
