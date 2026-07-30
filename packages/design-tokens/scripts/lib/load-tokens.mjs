import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../src/schema.json' with { type: 'json' };
import { validateTokens } from './validate-tokens.mjs';

export class TokenValidationError extends Error {
  constructor(errors) {
    super(formatErrors(errors));
    this.name = 'TokenValidationError';
    this.errors = errors;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export async function loadTokenDocument(path) {
  const document = JSON.parse(await readFile(path, 'utf8'));

  if (!validate(document)) {
    throw new TokenValidationError(validate.errors ?? []);
  }

  return validateTokens(document);
}

function formatErrors(errors) {
  return errors
    .slice()
    .sort((left, right) => compareCodeUnits(left.instancePath, right.instancePath) || compareCodeUnits(left.keyword, right.keyword))
    .map((error) => `${error.instancePath || '/'}: ${error.message}`)
    .join('\n');
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
