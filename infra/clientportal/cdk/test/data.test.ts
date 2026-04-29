import { describe, it, expect } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { DataStack } from "../lib/data-stack";

function buildTemplate(): Template {
  const app = new cdk.App();
  const stack = new DataStack(app, "DataStack-Test");
  return Template.fromStack(stack);
}

const USER_OWNED_TABLES = [
  "Users",
  "DiscoveryResponses",
  "Outcomes",
  "IntakeForms",
];

const GLOBAL_TABLES = ["Programs", "WeeklyContent", "AdminQueue", "TierCatalog", "AppConfig"];

const ALL_TABLES = [...USER_OWNED_TABLES, ...GLOBAL_TABLES];

describe("DataStack — DynamoDB tables", () => {
  let template: Template;

  it("synthesizes without error", () => {
    expect(() => {
      template = buildTemplate();
    }).not.toThrow();
    template = buildTemplate();
  });

  it("creates exactly 9 tables", () => {
    template = buildTemplate();
    template.resourceCountIs("AWS::DynamoDB::Table", 9);
  });

  it.each(ALL_TABLES)(
    "table %s has PAY_PER_REQUEST billing",
    (tableName) => {
      template = buildTemplate();
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: tableName,
        BillingMode: "PAY_PER_REQUEST",
      });
    }
  );

  it.each(USER_OWNED_TABLES)(
    "user-owned table %s has PK id and byOwner GSI on owner",
    (tableName) => {
      template = buildTemplate();
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: tableName,
        KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
        GlobalSecondaryIndexes: [
          {
            IndexName: "byOwner",
            KeySchema: [{ AttributeName: "owner", KeyType: "HASH" }],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      });
    }
  );

  it.each(GLOBAL_TABLES)(
    "non-user-owned table %s does NOT have a byOwner GSI",
    (tableName) => {
      template = buildTemplate();
      // Retrieve all DynamoDB tables and check the one matching this name
      const resources = template.findResources("AWS::DynamoDB::Table", {
        Properties: { TableName: tableName },
      });
      const entries = Object.values(resources);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        const gsis: Array<{ IndexName: string }> =
          entry.Properties?.GlobalSecondaryIndexes ?? [];
        const hasOwnerGsi = gsis.some((g) => g.IndexName === "byOwner");
        expect(hasOwnerGsi).toBe(false);
      }
    }
  );

  it("AppConfig table has PK key", () => {
    template = buildTemplate();
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "AppConfig",
      KeySchema: [{ AttributeName: "key", KeyType: "HASH" }],
    });
  });

  const ALL_NINE_TABLES = [...USER_OWNED_TABLES, ...GLOBAL_TABLES];

  it.each(ALL_NINE_TABLES)(
    "table %s has deletion protection enabled",
    (tableName) => {
      template = buildTemplate();
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: tableName,
        DeletionProtectionEnabled: true,
      });
    }
  );
});
