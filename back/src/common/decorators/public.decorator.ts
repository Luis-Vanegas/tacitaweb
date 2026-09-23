// Marca una ruta como pública: JwtAuthGuard (global) la deja pasar sin token.
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
