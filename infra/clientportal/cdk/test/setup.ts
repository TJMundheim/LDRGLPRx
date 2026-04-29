import { expect } from 'vitest';
import { Match } from 'aws-cdk-lib/assertions';

// CDK's `Match` does not understand vitest's asymmetric matchers
// (`expect.anything()` etc.). Override `expect.anything` to return
// `Match.anyValue()` so CDK template assertions work as authors expect.
Object.defineProperty(expect, 'anything', {
  configurable: true,
  writable: true,
  value: () => Match.anyValue(),
});
