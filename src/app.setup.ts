import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvironmentVariables } from './config/env.validation';

export const SWAGGER_PATH = 'api/docs';

/**
 * Configuração global da aplicação (CORS, validação, serialização, erros e Swagger).
 * Compartilhada entre `main.ts` e os testes e2e para que ambos se comportem igual.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  // A Hostinger encaminha o IP original no primeiro proxy confiável.
  // Isso faz request.ip refletir o cliente, usado no limite de recuperação.
  const expressApp = app.getHttpAdapter().getInstance() as unknown as {
    set(setting: string, value: number): void;
  };
  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: parseOrigins(config.get('FRONTEND_URL', { infer: true })),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    setupSwagger(app);
  }
}

/** FRONTEND_URL aceita várias origens separadas por vírgula, ou "*" para liberar todas. */
export function parseOrigins(value: string): string[] | boolean {
  if (value.trim() === '*') return true;
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Gestão Comercial e Precificação Dinâmica')
      .setDescription(
        'API para gestão de produtos, cotações, fórmulas de precificação e formação de preços. ' +
          'Autentique-se em `POST /auth/login` e use o token no botão **Authorize**.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    swaggerOptions: { persistAuthorization: true },
  });
}
