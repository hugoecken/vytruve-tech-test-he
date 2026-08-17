import { HttpStatus } from '@nestjs/common';
import sharp from 'sharp';
import { ProblemCode } from '@api/http/problem-code';
import { expectProblemDetails } from '@api/test-support/problem-details';
import { PatientPhotoValidator } from './patient-photo.validator';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

describe(PatientPhotoValidator.name, () => {
  const validator = new PatientPhotoValidator();

  it.each([
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
  ] as const)('accepts a decodable %s image', async (format, mediaType) => {
    const content = await createImage(format);

    await expect(validator.validate(content, mediaType)).resolves.toEqual({
      content,
      format,
      mediaType,
      sizeBytes: content.length,
    });
  });

  it('accepts a decodable image exactly at the inclusive size limit', async () => {
    const image = await createImage('png');
    const content = Buffer.concat([
      image,
      Buffer.alloc(MAX_PHOTO_SIZE_BYTES - image.length),
    ]);

    await expect(
      validator.validate(content, 'image/png'),
    ).resolves.toMatchObject({
      format: 'png',
      sizeBytes: MAX_PHOTO_SIZE_BYTES,
    });
  });

  it('rejects content one byte above the size limit before decoding', async () => {
    const content = Buffer.alloc(MAX_PHOTO_SIZE_BYTES + 1);

    await expectProblemDetails(
      validator.validate(content, 'image/png'),
      ProblemCode.PATIENT_PHOTO_TOO_LARGE,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  });

  it('rejects empty content as invalid', async () => {
    await expectProblemDetails(
      validator.validate(Buffer.alloc(0), 'image/png'),
      ProblemCode.PATIENT_PHOTO_INVALID_CONTENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('rejects unsupported declared content without decoding it', async () => {
    await expectProblemDetails(
      validator.validate(Buffer.from('<svg/>'), 'image/svg+xml'),
      ProblemCode.PATIENT_PHOTO_UNSUPPORTED_TYPE,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  });

  it('rejects corrupt content declared as a supported image', async () => {
    const corruptPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

    await expectProblemDetails(
      validator.validate(corruptPng, 'image/png'),
      ProblemCode.PATIENT_PHOTO_INVALID_CONTENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('rejects a declared type that disagrees with decoded content', async () => {
    const content = await createImage('png');

    await expectProblemDetails(
      validator.validate(content, 'image/jpeg'),
      ProblemCode.PATIENT_PHOTO_UNSUPPORTED_TYPE,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  });
});

/** Creates a deterministic synthetic one-pixel image for validation tests. */
async function createImage(format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
  return sharp({
    create: {
      background: { alpha: 1, b: 80, g: 120, r: 160 },
      channels: 4,
      height: 1,
      width: 1,
    },
  })
    .toFormat(format)
    .toBuffer();
}
