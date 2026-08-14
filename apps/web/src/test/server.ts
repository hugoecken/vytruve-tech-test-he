import { setupServer } from 'msw/node';

/** Shared request boundary reset between independently controlled Web tests. */
export const server = setupServer();
