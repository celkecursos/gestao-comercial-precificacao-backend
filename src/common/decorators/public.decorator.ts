import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota (ou controller) como pública, dispensando o JWT. Todas as demais rotas são protegidas. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
