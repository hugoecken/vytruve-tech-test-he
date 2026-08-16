import { defineConfig } from 'orval';

const generatedRoot = 'apps/web/src/shared/api/generated';

export default defineConfig({
  apiClient: {
    input: {
      target: 'generated/openapi.json',
    },
    output: {
      target: `${generatedRoot}/client`,
      schemas: `${generatedRoot}/models`,
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'fetch',
      clean: [`${generatedRoot}/client`, `${generatedRoot}/models`],
      override: {
        mutator: {
          path: 'apps/web/src/shared/api/http/api-client.ts',
          name: 'apiClient',
        },
        fetch: {
          forceSuccessResponse: true,
        },
        query: {
          useInfinite: false,
          signal: true,
          version: 5,
        },
      },
    },
  },
  requestSchemas: {
    input: {
      target: 'generated/openapi.json',
      filters: {
        tags: ['Authentication', 'Patients'],
      },
    },
    output: {
      target: `${generatedRoot}/validation`,
      mode: 'tags-split',
      client: 'zod',
      clean: [`${generatedRoot}/validation`],
      fileExtension: '.zod.ts',
      override: {
        zod: {
          variant: 'mini',
          version: 4,
          strict: {
            body: true,
          },
          generate: {
            param: false,
            query: false,
            header: false,
            body: true,
            response: false,
          },
        },
      },
    },
  },
});
