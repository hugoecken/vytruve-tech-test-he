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
  MAX_SCAN_SIZE_BYTES: number;
  MINIO_ACCESS_KEY: string;
  MINIO_BUCKET: string;
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_SECRET_KEY: string;
  MINIO_USE_SSL: boolean;
  NODE_ENV: string;
  POSTGRES_DB: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_USER: string;
  PRINTING_API_BASE_URL: string;
  PRINTING_API_KEY: string;
  PRINTING_API_TIMEOUT_MS: number;
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

  const printingBaseUrlValue = requireString(
    environment,
    'PRINTING_API_BASE_URL',
  );
  let printingBaseUrl: URL;
  try {
    printingBaseUrl = new URL(printingBaseUrlValue);
  } catch {
    throw new Error('PRINTING_API_BASE_URL must be an absolute HTTP(S) URL');
  }
  if (
    !['http:', 'https:'].includes(printingBaseUrl.protocol) ||
    printingBaseUrl.username.length > 0 ||
    printingBaseUrl.password.length > 0 ||
    printingBaseUrl.search.length > 0 ||
    printingBaseUrl.hash.length > 0
  ) {
    throw new Error('PRINTING_API_BASE_URL must be an absolute HTTP(S) URL');
  }
  const printingPath =
    printingBaseUrl.pathname === '/'
      ? ''
      : printingBaseUrl.pathname.replace(/\/+$/, '');
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
    MAX_SCAN_SIZE_BYTES: parsePositiveInteger(
      environment,
      'MAX_SCAN_SIZE_BYTES',
    ),
    MINIO_ACCESS_KEY: requireString(environment, 'MINIO_ACCESS_KEY'),
    MINIO_BUCKET: requireString(environment, 'MINIO_BUCKET'),
    MINIO_ENDPOINT: requireString(environment, 'MINIO_ENDPOINT'),
    MINIO_PORT: parsePort(environment, 'MINIO_PORT'),
    MINIO_SECRET_KEY: requireString(environment, 'MINIO_SECRET_KEY'),
    MINIO_USE_SSL: parseBoolean(environment, 'MINIO_USE_SSL'),
    NODE_ENV: nodeEnvironment,
    POSTGRES_DB: requireString(environment, 'POSTGRES_DB'),
    POSTGRES_PASSWORD: requireString(environment, 'POSTGRES_PASSWORD'),
    POSTGRES_USER: requireString(environment, 'POSTGRES_USER'),
    PRINTING_API_BASE_URL: `${printingBaseUrl.origin}${printingPath}`,
    PRINTING_API_KEY: requireString(environment, 'PRINTING_API_KEY'),
    PRINTING_API_TIMEOUT_MS: parsePositiveInteger(
      environment,
      'PRINTING_API_TIMEOUT_MS',
    ),
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

/**
 * Parses one required explicit boolean value.
 *
 * @param environment Raw environment values loaded by Nest.
 * @param name Boolean variable name.
 * @returns The configured boolean value.
 * @throws When the value is neither `true` nor `false`.
 */
function parseBoolean(
  environment: Record<string, unknown>,
  name: string,
): boolean {
  const value = environment[name];
  if (value !== 'true' && value !== 'false') {
    throw new Error(`${name} must be either true or false`);
  }
  return value === 'true';
}

/**
 * Parses one required positive integer configuration value.
 *
 * @param environment Raw environment values loaded by Nest.
 * @param name Integer variable name.
 * @returns The configured positive integer within the runtime timer range.
 * @throws When the value exceeds the supported signed-integer boundary.
 */
function parsePositiveInteger(
  environment: Record<string, unknown>,
  name: string,
): number {
  const value = Number(environment[name]);
  if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw new Error(`${name} must be an integer between 1 and 2147483647`);
  }
  return value;
}
