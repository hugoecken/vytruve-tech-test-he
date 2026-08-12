import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../config/environment';

/** Composes the API foundation without exposing product endpoints. */
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validate: validateEnvironment,
    }),
  ],
})
export class AppModule {}
