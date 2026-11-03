import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,    //remove the properties that are not in DTOs
      forbidNonWhitelisted:true,   //instead of silently removing, return 400 if extra field appear
      transform:true        //make body a real login/signupDTO instance
    })
  )  
  app.enableCors({
    origin: ['http://localhost:3000'],
  })
  await app.listen(5000);
}
bootstrap();
