import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface AuthStackProps extends cdk.StackProps {
  usersTable?: dynamodb.ITable;
}

/**
 * AuthStack — passwordless Cognito (email-OTP via custom-auth flow)
 * + IdentityPool + Admins group + Lambda triggers.
 *
 * Cognito stores ONLY email. All other profile data lives in DynamoDB.
 */
export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    const lambdaDir = path.join(__dirname, '..', 'lambdas', 'auth');
    const mkFn = (name: string, file: string) =>
      new NodejsFunction(this, name, {
        entry: path.join(lambdaDir, file),
        handler: 'handler',
        runtime: Runtime.NODEJS_20_X,
        bundling: { target: 'node20', minify: false, sourceMap: true },
      });

    const defineAuthChallenge = mkFn(
      'DefineAuthChallengeFn',
      'define-auth-challenge.ts',
    );
    const createAuthChallenge = mkFn(
      'CreateAuthChallengeFn',
      'create-auth-challenge.ts',
    );
    const verifyAuthChallenge = mkFn(
      'VerifyAuthChallengeFn',
      'verify-auth-challenge.ts',
    );
    const postConfirmation = mkFn(
      'PostConfirmationFn',
      'post-confirmation.ts',
    );
    const postAuthentication = mkFn(
      'PostAuthenticationFn',
      'post-authentication.ts',
    );

    // SES: grant createAuthChallenge permission to send email via SES.
    createAuthChallenge.addEnvironment('FROM_EMAIL', 'noreply@my4mlife.com');
    createAuthChallenge.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'sesv2:SendEmail'],
        resources: ['*'],
      }),
    );

    // Wire Users table env var + permissions if provided.
    if (props?.usersTable) {
      const tableName = props.usersTable.tableName;
      postConfirmation.addEnvironment('USERS_TABLE', tableName);
      postAuthentication.addEnvironment('USERS_TABLE', tableName);
      props.usersTable.grantReadWriteData(postConfirmation);
      props.usersTable.grantReadWriteData(postAuthentication);
    }

    // UserPool — email-only, passwordless via custom auth.
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'clientportal-users',
      signInAliases: { email: true },
      signInCaseSensitive: false,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      // No name, phone, address, or custom attributes — DDB owns profile data.
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lambdaTriggers: {
        defineAuthChallenge,
        createAuthChallenge,
        verifyAuthChallengeResponse: verifyAuthChallenge,
        postConfirmation,
        postAuthentication,
      },
    });

    // App client — custom-auth ONLY. No password / SRP.
    this.userPoolClient = this.userPool.addClient('AppClient', {
      authFlows: { custom: true },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });

    // Admins group.
    new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Admins',
      description: 'Administrative users for the client portal',
    });

    // Identity pool federated to the user pool.
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: 'clientportal_identity_pool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    const principal = (amr: 'authenticated' | 'unauthenticated') =>
      new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': amr },
        },
        'sts:AssumeRoleWithWebIdentity',
      );

    const authRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: principal('authenticated'),
    });
    const unauthRole = new iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: principal('unauthenticated'),
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authRole.roleArn,
        unauthenticated: unauthRole.roleArn,
      },
    });

    new cdk.CfnOutput(this, 'userPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'identityPoolId', { value: this.identityPool.ref });
  }
}
