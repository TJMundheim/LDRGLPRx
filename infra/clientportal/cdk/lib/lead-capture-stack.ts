import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const USER_POOL_ID = 'us-east-2_kIpKnr17R';
const APP_CLIENT_ID = '6bur4eipv67vlsmi0qceqv9fd0';

export interface LeadCaptureStackProps extends cdk.StackProps {
  usersTable?: dynamodb.Table;
}

export class LeadCaptureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: LeadCaptureStackProps) {
    super(scope, id, props);

    // ── send-app-link Lambda ────────────────────────────────────────────────
    const sendAppLink = new NodejsFunction(this, 'SendAppLinkFn', {
      entry: path.join(__dirname, '..', 'lambdas', 'lead-capture', 'send-app-link.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      bundling: { target: 'node20', minify: false, sourceMap: true },
      timeout: cdk.Duration.seconds(15),
    });

    sendAppLink.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
        resources: [`arn:aws:ses:us-east-2:879696522760:identity/*`],
      }),
    );

    // ── request-otp Lambda ─────────────────────────────────────────────────
    const requestOtp = new NodejsFunction(this, 'RequestOtpFn', {
      entry: path.join(__dirname, '..', 'lambdas', 'auth', 'request-otp.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      bundling: { target: 'node20', minify: false, sourceMap: true },
      timeout: cdk.Duration.seconds(15),
      environment: {
        USER_POOL_ID,
        APP_CLIENT_ID,
        USERS_TABLE: props?.usersTable?.tableName ?? 'Users',
      },
    });

    // Cognito admin permissions
    requestOtp.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:InitiateAuth',
        ],
        resources: [`arn:aws:cognito-idp:us-east-2:879696522760:userpool/${USER_POOL_ID}`],
      }),
    );

    // DynamoDB PutItem
    if (props?.usersTable) {
      props.usersTable.grantWriteData(requestOtp);
    } else {
      requestOtp.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['dynamodb:PutItem'],
          resources: [`arn:aws:dynamodb:us-east-2:879696522760:table/Users`],
        }),
      );
    }

    // ── HTTP API ───────────────────────────────────────────────────────────
    const api = new apigwv2.HttpApi(this, 'LeadCaptureApi', {
      apiName: 'My4MLifeLeadCapture',
      corsPreflight: {
        allowOrigins: [
          'https://www.my4mlife.com',
          'https://my4mlife.com',
          'https://app.my4mlife.com',
          'http://localhost:4321',
          'http://localhost:5173',
        ],
        allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
    });

    api.addRoutes({
      path: '/api/send-app-link',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('SendAppLinkIntegration', sendAppLink),
    });

    api.addRoutes({
      path: '/api/request-otp',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('RequestOtpIntegration', requestOtp),
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
