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

// lambdas/auth/create-auth-challenge.ts
var create_auth_challenge_exports = {};
__export(create_auth_challenge_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(create_auth_challenge_exports);
var import_crypto = require("crypto");
var handler = async (event) => {
  if (event.request.challengeName !== "CUSTOM_CHALLENGE") {
    return event;
  }
  let code;
  const previous = event.request.session?.find(
    (s) => s.challengeName === "CUSTOM_CHALLENGE" && s.challengeMetadata
  );
  if (previous?.challengeMetadata) {
    code = previous.challengeMetadata.replace(/^CODE-/, "");
  } else {
    code = String((0, import_crypto.randomInt)(0, 1e6)).padStart(6, "0");
  }
  event.response.publicChallengeParameters = {
    email: event.request.userAttributes.email ?? ""
  };
  event.response.privateChallengeParameters = { code };
  event.response.challengeMetadata = `CODE-${code}`;
  return event;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=index.js.map
