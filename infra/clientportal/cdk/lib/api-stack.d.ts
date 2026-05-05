import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export interface ApiStackProps extends cdk.StackProps {
    userPool?: cognito.IUserPool;
    usersTable?: dynamodb.ITable;
    discoveryResponsesTable?: dynamodb.ITable;
    outcomesTable?: dynamodb.ITable;
    intakeFormsTable?: dynamodb.ITable;
    programsTable?: dynamodb.ITable;
    weeklyContentTable?: dynamodb.ITable;
    adminQueueTable?: dynamodb.ITable;
    appConfigTable?: dynamodb.ITable;
    tierCatalogTable?: dynamodb.ITable;
}
export declare class ApiStack extends cdk.Stack {
    readonly api: appsync.GraphqlApi;
    constructor(scope: Construct, id: string, props?: ApiStackProps);
}
