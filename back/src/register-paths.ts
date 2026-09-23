// Habilita en runtime (dev y prod, tras compilar a dist/) el alias `@/` que
// tsconfig.json declara como `src/*`. tsc no reescribe imports con paths al
// emitir JS, así que hace falta registrar la resolución manualmente con el
// tsconfig-paths que ya trae el scaffold de Nest — sin depender de variables
// de entorno (cross-env) para que funcione igual en Windows y en CI.
import { join } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: join(__dirname),
  paths: {
    '@/*': ['*'],
  },
});
