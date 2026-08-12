const NODE_ENVIRONMENTS = ['development', 'production', 'test'];
const MINIMUM_SECRET_LENGTH = 32;

/** Validated environment consumed by the API composition root. */
export interface ApiEnvironment {
  API_PORT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  JWT_AUDIENCE: string;
  JWT_ISSUER: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  POSTGRES_DB: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_USER: string;
  WEB_ORIGIN: string;
}

/**
 * Validates the environment values consumed by the current API features.
 *
 * @param environment Raw process environment loaded by Nest configuration.
 * @returns The original environment with normalized application values.
 * @throws When a required variable is missing or has an unsupported shape.
 */
export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> & ApiEnvironment {
  const nodeEnvironment = environment.NODE_ENV;
  if (
    typeof nodeEnvironment !== 'string' ||
    !NODE_ENVIRONMENTS.includes(nodeEnvironment)
  ) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}`);
  }

  const webOriginValue = requireString(environment, 'WEB_ORIGIN');
  let webOrigin: URL;
  try {
    webOrigin = new URL(webOriginValue);
  } catch {
    throw new Error('WEB_ORIGIN must be an absolute HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(webOrigin.protocol) ||
    webOrigin.username.length > 0 ||
    webOrigin.password.length > 0 ||
    webOrigin.pathname !== '/' ||
    webOrigin.search.length > 0 ||
    webOrigin.hash.length > 0
  ) {
    throw new Error('WEB_ORIGIN must be an absolute HTTP(S) origin');
  }

  return {
    ...environment,
    API_PORT: parsePort(environment, 'API_PORT'),
    DATABASE_HOST: requireString(environment, 'DATABASE_HOST'),
    DATABASE_PORT: parsePort(environment, 'DATABASE_PORT'),
    JWT_AUDIENCE: requireString(environment, 'JWT_AUDIENCE'),
    JWT_ISSUER: requireString(environment, 'JWT_ISSUER'),
    JWT_SECRET: requireSecret(environment, 'JWT_SECRET'),
    NODE_ENV: nodeEnvironment,
    POSTGRES_DB: requireString(environment, 'POSTGRES_DB'),
    POSTGRES_PASSWORD: requireString(environment, 'POSTGRES_PASSWORD'),
    POSTGRES_USER: requireString(environment, 'POSTGRES_USER'),
    WEB_ORIGIN: webOrigin.origin,
  };
}

/**
 * Reads a required non-empty environment value without exposing it in failures.
 *
 * @param environment Raw environment values loaded by Nest.
 * @param name Variable name whose presence is required.
 * @returns The trimmed configuration value.
 * @throws When the variable is missing or empty.
 */
function requireString(
  environment: Record<string, unknown>,
  name: string,
): string {
  const value = environment[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

/**
 * Validates an HMAC secret without exposing its value in failures.
 *
 * @param environment Raw environment values loaded by Nest.
 * @param name Secret variable name.
 * @returns The validated UTF-8 secret.
 * @throws When the secret is shorter than the accepted security minimum.
 */
function requireSecret(
  environment: Record<string, unknown>,
  name: string,
): string {
  const value = requireString(environment, name);
  if (Buffer.byteLength(value, 'utf8') < MINIMUM_SECRET_LENGTH) {
    throw new Error(`${name} must contain at least 32 bytes`);
  }
  return value;
}

/**
 * Parses a required TCP port.
 *
 * @param environment Raw environment values loaded by Nest.
 * @param name Port variable name.
 * @returns An integer port between 1 and 65535.
 * @throws When the value is not a valid port.
 */
function parsePort(environment: Record<string, unknown>, name: string): number {
  const port = Number(environment[name]);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}
