import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export interface LeadCaptureStackProps extends cdk.StackProps {
    usersTable?: dynamodb.Table;
}
export declare class LeadCaptureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: LeadCaptureStackProps);
}
