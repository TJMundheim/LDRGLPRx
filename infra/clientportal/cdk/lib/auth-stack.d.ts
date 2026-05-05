import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export interface AuthStackProps extends cdk.StackProps {
    usersTable?: dynamodb.ITable;
}
/**
 * AuthStack — passwordless Cognito (email-OTP via custom-auth flow)
 * + IdentityPool + Admins group + Lambda triggers.
 *
 * Cognito stores ONLY email. All other profile data lives in DynamoDB.
 */
export declare class AuthStack extends cdk.Stack {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly identityPool: cognito.CfnIdentityPool;
    constructor(scope: Construct, id: string, props?: AuthStackProps);
}
