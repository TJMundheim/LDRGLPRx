import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export class LeadCaptureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda
    const sendAppLink = new NodejsFunction(this, 'SendAppLinkFn', {
      entry: path.join(__dirname, '..', 'lambdas', 'lead-capture', 'send-app-link.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      bundling: { target: 'node20', minify: false, sourceMap: true },
      timeout: cdk.Duration.seconds(15),
    });

    // SES permission scoped to verified domain identity
    sendAppLink.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
        resources: [
          `arn:aws:ses:us-east-2:879696522760:identity/my4mlife.com`,
        ],
      }),
    );

    // HTTP API
    const api = new apigwv2.HttpApi(this, 'LeadCaptureApi', {
      apiName: 'My4MLifeLeadCapture',
      corsPreflight: {
        allowOrigins: [
          'https://www.my4mlife.com',
          'https://my4mlife.com',
          'https://app.my4mlife.com',
          'http://localhost:4321',
        ],
        allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
    });

    const integration = new HttpLambdaIntegration('SendAppLinkIntegration', sendAppLink);

    api.addRoutes({
      path: '/api/send-app-link',
      methods: [apigwv2.HttpMethod.POST],
      integration,
    });

    // Basic throttling via default stage
    const defaultStage = api.defaultStage?.node.defaultChild as apigwv2.CfnStage;
    if (defaultStage) {
      defaultStage.defaultRouteSettings = {
        throttlingRateLimit: 10,
        throttlingBurstLimit: 50,
      };
    }

    new cdk.CfnOutput(this, 'LeadCaptureApiUrl', {
      value: api.apiEndpoint,
      description: 'My4MLife Lead Capture API endpoint',
    });
  }
}
