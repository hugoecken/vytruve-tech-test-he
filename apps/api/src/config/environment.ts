const NODE_ENVIRONMENTS = ['development', 'production', 'test'];

/**
 * Validates the environment values consumed by the foundation API.
 *
 * @param environment Raw process environment loaded by Nest configuration.
 * @returns The original environment with normalized application values.
 * @throws When a required variable is missing or has an unsupported shape.
 */
export function validateEnvironment(environment: Record<string, unknown>) {
  const nodeEnvironment = environment.NODE_ENV;
  if (
    typeof nodeEnvironment !== 'string' ||
    !NODE_ENVIRONMENTS.includes(nodeEnvironment)
  ) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}`);
  }

  const apiPort = Number(environment.API_PORT);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  return {
    ...environment,
    API_PORT: apiPort,
    NODE_ENV: nodeEnvironment,
  };
}
