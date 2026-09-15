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

// src/handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);

// src/bedrock.ts
var import_client_bedrock_runtime = require("@aws-sdk/client-bedrock-runtime");
var REGION = process.env.AWS_REGION ?? "us-east-2";
var DEFAULT_MODEL = process.env.BEDROCK_MODEL ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";
var MODEL_MAP = {
  "claude-sonnet-4-6": "us.anthropic.claude-sonnet-4-6-20260101-v1:0",
  "claude-opus-4-7": "us.anthropic.claude-opus-4-7-20260101-v1:0"
};
function resolveModel(name) {
  if (name && MODEL_MAP[name]) return MODEL_MAP[name];
  return DEFAULT_MODEL;
}
var bedrock = new import_client_bedrock_runtime.BedrockRuntimeClient({ region: REGION });
async function invokeCoach(system, messages, model, maxTokens) {
  const res = await bedrock.send(new import_client_bedrock_runtime.InvokeModelCommand({
    modelId: resolveModel(model),
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      system,
      messages
    })
  }));
  const body = JSON.parse(new TextDecoder().decode(res.body));
  return body.content?.[0]?.text ?? "";
}

// src/handler.ts
var ALLOWED_MODELS = ["claude-sonnet-4-6", "claude-opus-4-7"];
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.PORTAL_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body)
  };
}
var handler = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  let body;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }
  const { system, messages, model, maxTokens = 1024 } = body;
  if (typeof system !== "string" || !system.trim()) return respond(400, { error: "system is required" });
  if (!Array.isArray(messages) || messages.length === 0) return respond(400, { error: "messages must be a non-empty array" });
  if (!ALLOWED_MODELS.includes(model)) return respond(400, { error: `model must be one of: ${ALLOWED_MODELS.join(", ")}` });
  if (typeof maxTokens !== "number" || maxTokens < 1 || maxTokens > 4096) return respond(400, { error: "maxTokens must be 1\u20134096" });
  for (const m of messages) {
    if (!["user", "assistant"].includes(m.role) || typeof m.content !== "string") {
      return respond(400, { error: "Each message must have role (user|assistant) and string content" });
    }
  }
  try {
    const content = await invokeCoach(system, messages, model, maxTokens);
    return respond(200, { content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bedrock error";
    return respond(502, { error: message });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
