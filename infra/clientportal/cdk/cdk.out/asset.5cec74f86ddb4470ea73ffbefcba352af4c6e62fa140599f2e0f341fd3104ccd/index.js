"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambdas/auth/post-authentication.ts
var post_authentication_exports = {};
__export(post_authentication_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(post_authentication_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var ddb = new import_client_dynamodb.DynamoDBClient({});
var TABLE = process.env.USERS_TABLE;
var handler = async (event) => {
  const { userName, request } = event;
  const email = request.userAttributes.email;
  const { Item } = await ddb.send(
    new import_client_dynamodb.GetItemCommand({ TableName: TABLE, Key: { id: { S: userName } } })
  );
  if (!Item) {
    await ddb.send(
      new import_client_dynamodb.PutItemCommand({
        TableName: TABLE,
        Item: {
          id: { S: userName },
          primaryEmail: { S: email },
          createdAt: { S: (/* @__PURE__ */ new Date()).toISOString() }
        },
        ConditionExpression: "attribute_not_exists(id)"
      })
    );
  } else if (Item.primaryEmail?.S !== email) {
    await ddb.send(
      new import_client_dynamodb.UpdateItemCommand({
        TableName: TABLE,
        Key: { id: { S: userName } },
        UpdateExpression: "SET primaryEmail = :e",
        ExpressionAttributeValues: { ":e": { S: email } }
      })
    );
  }
  return event;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=index.js.map
