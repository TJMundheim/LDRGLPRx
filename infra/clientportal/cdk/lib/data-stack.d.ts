import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
export declare class DataStack extends cdk.Stack {
    readonly usersTable: dynamodb.Table;
    readonly programsTable: dynamodb.Table;
    readonly weeklyContentTable: dynamodb.Table;
    readonly discoveryResponsesTable: dynamodb.Table;
    readonly outcomesTable: dynamodb.Table;
    readonly intakeFormsTable: dynamodb.Table;
    readonly adminQueueTable: dynamodb.Table;
    readonly appConfigTable: dynamodb.Table;
    readonly tierCatalogTable: dynamodb.Table;
    readonly contactTable: dynamodb.ITable;
    readonly eventsTable: dynamodb.ITable;
    readonly eventRsvpsTable: dynamodb.ITable;
    readonly adherenceTable: dynamodb.ITable;
    readonly patientRecordsTable: dynamodb.ITable;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
    private userOwnedTable;
    private simpleTable;
}
