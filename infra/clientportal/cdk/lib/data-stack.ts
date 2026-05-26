import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class DataStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly programsTable: dynamodb.Table;
  public readonly weeklyContentTable: dynamodb.Table;
  public readonly discoveryResponsesTable: dynamodb.Table;
  public readonly outcomesTable: dynamodb.Table;
  public readonly intakeFormsTable: dynamodb.Table;
  public readonly adminQueueTable: dynamodb.Table;
  public readonly appConfigTable: dynamodb.Table;
  public readonly tierCatalogTable: dynamodb.Table;
  public readonly contactTable: dynamodb.ITable;
  public readonly eventsTable: dynamodb.ITable;
  public readonly eventRsvpsTable: dynamodb.ITable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // User-owned tables: PK id + byOwner GSI
    this.usersTable = this.userOwnedTable("Users");
    this.discoveryResponsesTable = this.userOwnedTable("DiscoveryResponses");
    this.outcomesTable = this.userOwnedTable("Outcomes");
    this.intakeFormsTable = this.userOwnedTable("IntakeForms");

    // Simple tables: PK id
    this.programsTable = this.simpleTable("Programs");
    this.weeklyContentTable = this.simpleTable("WeeklyContent");
    this.adminQueueTable = this.simpleTable("AdminQueue");
    this.tierCatalogTable = this.simpleTable("TierCatalog");

    // Contact / Events / EventRSVPs already exist in AWS (created outside CDK).
    // Import by name to avoid recreation errors.
    this.contactTable = dynamodb.Table.fromTableName(this, "Contact", "Contact");
    this.eventsTable = dynamodb.Table.fromTableName(this, "Events", "Events");
    this.eventRsvpsTable = dynamodb.Table.fromTableName(this, "EventRSVPs", "EventRSVPs");

    // AppConfig: PK key
    this.appConfigTable = new dynamodb.Table(this, "AppConfig", {
      tableName: "AppConfig",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "key", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });
  }

  private userOwnedTable(name: string): dynamodb.Table {
    const table = new dynamodb.Table(this, name, {
      tableName: name,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });
    table.addGlobalSecondaryIndex({
      indexName: "byOwner",
      partitionKey: { name: "owner", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    return table;
  }

  private simpleTable(name: string): dynamodb.Table {
    return new dynamodb.Table(this, name, {
      tableName: name,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });
  }
}
