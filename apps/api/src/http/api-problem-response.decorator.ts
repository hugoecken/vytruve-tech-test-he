import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ProblemDetailsResponse } from './problem-details.dto';

/**
 * Documents one endpoint-specific RFC 9457 response with the correct media type.
 *
 * @param status HTTP failure status.
 * @param description Failure-specific behavior shown in OpenAPI.
 * @returns Combined Swagger decorators for a Problem Details response.
 */
export function ApiProblemResponse(
  status: number,
  description: string,
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(ProblemDetailsResponse),
    ApiResponse({
      content: {
        'application/problem+json': {
          schema: { $ref: getSchemaPath(ProblemDetailsResponse) },
        },
      },
      description,
      status,
    }),
  );
}
