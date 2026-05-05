import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it, expect } from 'vitest';
import { LeadCaptureStack } from '../lib/lead-capture-stack';

describe('LeadCaptureStack', () => {
  function buildTemplate(): Template {
    const app = new App();
    const stack = new LeadCaptureStack(app, 'TestLeadCaptureStack', {});
    return Template.fromStack(stack);
  }

  it('defines the /api/send-app-link route', () => {
    const template = buildTemplate();
    const routes = template.findResources('AWS::ApiGatewayV2::Route');
    const routeKeys = Object.values(routes).map((r: any) => r.Properties?.RouteKey);
    expect(routeKeys).toContain('POST /api/send-app-link');
  });

  it('defines the /api/request-otp route', () => {
    const template = buildTemplate();
    const routes = template.findResources('AWS::ApiGatewayV2::Route');
    const routeKeys = Object.values(routes).map((r: any) => r.Properties?.RouteKey);
    expect(routeKeys).toContain('POST /api/request-otp');
  });

  it('creates two Lambda functions', () => {
    const template = buildTemplate();
    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  it('grants Cognito admin permissions to RequestOtpFn', () => {
    const template = buildTemplate();
    const policies = template.findResources('AWS::IAM::Policy');
    const policyDocs = Object.values(policies).map((p: any) => JSON.stringify(p.Properties?.PolicyDocument));
    const hasCognito = policyDocs.some(
      (doc) =>
        doc.includes('cognito-idp:AdminGetUser') &&
        doc.includes('cognito-idp:AdminCreateUser') &&
        doc.includes('cognito-idp:InitiateAuth'),
    );
    expect(hasCognito).toBe(true);
  });
});
