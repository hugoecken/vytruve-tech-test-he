import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app/app.module';
import { SESSION_COOKIE_NAME } from './app/auth/infrastructure/security/session.constants';
import type { ApiEnvironment } from './config/environment';
import { ProblemDetailsFilter } from './http/problem-details.filter';
import { createValidationException } from './validation/create-validation-exception';

const OPENAPI_OUTPUT = resolve('generated/openapi.json');

/**
 * Creates the API with the shared security, validation, logging, and HTTP policy.
 *
 * @returns A configured Nest Express application that has not started listening.
 */
async function createApplication(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ colors: false, json: true }),
  });
  const config = app.get<ConfigService<ApiEnvironment, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: createValidationException,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
  return app;
}

/** Starts the API with validated configuration and the accepted global route prefix. */
async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const config = app.get<ConfigService<ApiEnvironment, true>>(ConfigService);
  const port = config.getOrThrow<number>('API_PORT');

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

/** Emits the reproducible OpenAPI document without exposing a documentation route. */
async function emitOpenApi(): Promise<void> {
  const app = await createApplication();
  const configuration = new DocumentBuilder()
    .setTitle('Vytruve API')
    .setDescription(
      'Authenticated account and patient-record workflows for orthoprosthetists.',
    )
    .setVersion('1.0.0')
    .addTag(
      'Authentication',
      'Account registration and browser-managed session lifecycle.',
    )
    .addTag('Patients', 'Owner-scoped patient record creation and retrieval.')
    .addTag(
      'Scans',
      'Validated patient PLY scans and authorized private content streaming.',
    )
    .addCookieAuth(
      SESSION_COOKIE_NAME,
      {
        in: 'cookie',
        type: 'apiKey',
      },
      SESSION_COOKIE_NAME,
    )
    .build();
  const document = SwaggerModule.createDocument(app, configuration);

  await mkdir(dirname(OPENAPI_OUTPUT), { recursive: true });
  await writeFile(OPENAPI_OUTPUT, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  Logger.log(`OpenAPI emitted to ${OPENAPI_OUTPUT}`, 'OpenAPI');
}

void (process.argv.includes('--openapi') ? emitOpenApi() : bootstrap());
