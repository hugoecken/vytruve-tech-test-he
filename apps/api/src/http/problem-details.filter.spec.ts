import { PayloadTooLargeException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProblemCode } from './problem-code';
import { ProblemDetailsFilter } from './problem-details.filter';

describe(ProblemDetailsFilter.name, () => {
  it.each([
    ['POST', '/api/patients', ProblemCode.PATIENT_PHOTO_TOO_LARGE],
    [
      'PATCH',
      '/api/patients/00000000-0000-4000-8000-000000000001',
      ProblemCode.PATIENT_PHOTO_TOO_LARGE,
    ],
    [
      'POST',
      '/api/patients/00000000-0000-4000-8000-000000000001/scans',
      ProblemCode.SCAN_TOO_LARGE,
    ],
  ])('maps %s %s to %s', (method, path, code) => {
    const response = responseDouble();
    const host = hostDouble({ method, path } as Request, response);

    new ProblemDetailsFilter().catch(new PayloadTooLargeException(), host);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code, instance: path, status: 413 }),
    );
  });
});

/** Creates the response calls used by the global RFC 9457 filter. */
function responseDouble() {
  const response = {
    json: jest.fn(),
    status: jest.fn(),
    type: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.type.mockReturnValue(response);
  return response;
}

/** Creates the minimal Nest HTTP arguments host used by the filter. */
function hostDouble(
  request: Request,
  response: ReturnType<typeof responseDouble>,
): ArgumentsHost {
  return {
    getArgByIndex: jest.fn(),
    getArgs: jest.fn(),
    getType: jest.fn(),
    switchToHttp: () => ({
      getNext: jest.fn(),
      getRequest: () => request,
      getResponse: () => response as unknown as Response,
    }),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ArgumentsHost;
}
