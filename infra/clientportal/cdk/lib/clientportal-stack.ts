import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * ClientPortalStack — placeholder stack.
 *
 * Resources (Cognito user pool, AppSync API, DynamoDB tables, etc.)
 * will be added in subsequent plan tasks.
 */
export class ClientPortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}
