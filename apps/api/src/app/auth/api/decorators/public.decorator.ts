import { SetMetadata } from '@nestjs/common';

/** Metadata key used by the global authentication guard. */
export const PUBLIC_ROUTE_METADATA = 'vytruve.public-route';

/**
 * Marks an endpoint as intentionally accessible without a valid session.
 *
 * @returns Class and method metadata consumed by the global authentication guard.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PUBLIC_ROUTE_METADATA, true);
