import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// La lista de entidades de database.config.ts es explícita (Netlify Functions
// no resuelve globs): una entidad nueva que no se agrega ahí rompe en runtime
// con EntityMetadataNotFoundError (pasó con Compromiso). Este test lo atrapa.
describe('databaseConfig.entities', () => {
  it('incluye todas las clases de database/entities', () => {
    const config = readFileSync(join(__dirname, 'database.config.ts'), 'utf8');
    const lista = config.slice(config.indexOf('entities: ['));
    const dirs = ['entities', 'entities/views'].map((d) =>
      join(__dirname, '..', 'database', d),
    );

    const faltantes = dirs.flatMap((dir) =>
      readdirSync(dir)
        .filter((f) => /\.(view-)?entity\.ts$/.test(f))
        .flatMap((f) =>
          [
            ...readFileSync(join(dir, f), 'utf8').matchAll(
              /@(?:View)?Entity\([\s\S]*?\)\s*export class (\w+)/g,
            ),
          ].map((m) => m[1]),
        )
        .filter((clase) => !new RegExp(`\\b${clase},`).test(lista)),
    );

    expect(faltantes).toEqual([]);
  });
});
