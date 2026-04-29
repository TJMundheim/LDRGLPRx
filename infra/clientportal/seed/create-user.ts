/**
 * create-user.ts
 * Creates a passwordless Cognito user + DynamoDB UserProfile row.
 *
 * Usage:
 *   tsx create-user.ts --email <email> --name <name> [--admin]
 *
 * Required env (or hard-coded constants below):
 *   USER_POOL_ID   Cognito User Pool ID
 *   REGION         AWS region
 *   USERS_TABLE    DynamoDB table name (default: Users)
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_USER_POOL_ID = "us-east-2_kIpKnr17R";
const DEFAULT_REGION = "us-east-2";
const DEFAULT_USERS_TABLE = "Users";

// ─── CLI arg parsing ──────────────────────────────────────────────────────────
function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const email = (args["email"] as string) ?? "";
const name = (args["name"] as string) ?? "";
const isAdmin = Boolean(args["admin"]);

if (!email || !name) {
  console.error("Usage: tsx create-user.ts --email <email> --name <name> [--admin]");
  process.exit(1);
}

const USER_POOL_ID = process.env["USER_POOL_ID"] ?? DEFAULT_USER_POOL_ID;
const REGION = process.env["REGION"] ?? DEFAULT_REGION;
const USERS_TABLE = process.env["USERS_TABLE"] ?? DEFAULT_USERS_TABLE;

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const dynamo = new DynamoDBClient({ region: REGION });

// ─── Step 1: AdminCreateUser (passwordless, no email sent) ────────────────────
console.log(`\n[1/5] Creating Cognito user: ${email}`);
const createResp = await cognito.send(
  new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    MessageAction: "SUPPRESS",
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "email_verified", Value: "true" },
    ],
  })
);

const user = createResp.User!;
const sub = user.Attributes?.find((a) => a.Name === "sub")?.Value;
if (!sub) {
  console.error("ERROR: Could not extract sub from AdminCreateUser response.");
  process.exit(1);
}
console.log(`    sub: ${sub}`);
console.log(`    username: ${user.Username}`);
console.log(`    status: ${user.UserStatus}`);

// ─── Step 2: AdminAddUserToGroup ──────────────────────────────────────────────
if (isAdmin) {
  console.log(`\n[2/5] Adding user to Admins group...`);
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: "Admins",
    })
  );
  console.log("    Done.");
} else {
  console.log(`\n[2/5] --admin not set; skipping group assignment.`);
}

// ─── Step 3: PutItem in DynamoDB Users table ──────────────────────────────────
const createdAt = new Date().toISOString();
console.log(`\n[3/5] Writing DynamoDB row to table "${USERS_TABLE}"...`);
try {
  await dynamo.send(
    new PutItemCommand({
      TableName: USERS_TABLE,
      Item: {
        id: { S: sub },
        primaryEmail: { S: email },
        name: { S: name },
        createdAt: { S: createdAt },
      },
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  console.log("    Row written.");
} catch (err: any) {
  if (err.name === "ConditionalCheckFailedException") {
    console.warn("    Row already exists — skipping write (safe re-run).");
  } else {
    throw err;
  }
}

// ─── Step 4: AdminListGroupsForUser — confirm groups ─────────────────────────
console.log(`\n[4/5] Listing groups for user...`);
const groupsResp = await cognito.send(
  new AdminListGroupsForUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
  })
);
const groups = groupsResp.Groups?.map((g) => g.GroupName) ?? [];
console.log(`    groups: ${groups.length ? groups.join(", ") : "(none)"}`);

// ─── Step 5: GetItem from DynamoDB — confirm row ──────────────────────────────
console.log(`\n[5/5] Reading back DynamoDB row...`);
const getResp = await dynamo.send(
  new GetItemCommand({
    TableName: USERS_TABLE,
    Key: { id: { S: sub } },
  })
);
const row = getResp.Item;

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log("  USER CREATED SUCCESSFULLY");
console.log("════════════════════════════════════════════════════════");
console.log(`  sub          : ${sub}`);
console.log(`  email        : ${email}`);
console.log(`  name         : ${name}`);
console.log(`  groups       : ${groups.length ? groups.join(", ") : "(none)"}`);
console.log(`  createdAt    : ${createdAt}`);
console.log("  DynamoDB row :");
console.log(JSON.stringify(row, null, 4));
console.log("════════════════════════════════════════════════════════\n");
