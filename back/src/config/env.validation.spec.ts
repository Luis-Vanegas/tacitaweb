import { validate } from './env.validation';

const ENV_VALIDO = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  DATABASE_SSL: 'true',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CORS_ORIGIN: 'http://localhost:5173',
};

describe('validate (env.validation)', () => {
  it('acepta una configuración válida y castea DATABASE_SSL/PORT', () => {
    const config = validate({ ...ENV_VALIDO, PORT: '4000' });

    expect(config.DATABASE_SSL).toBe(true);
    expect(config.PORT).toBe(4000);
  });

  it('usa el default de PORT cuando no viene', () => {
    const config = validate({ ...ENV_VALIDO });
    expect(config.PORT).toBe(3000);
  });

  it('falla si falta DATABASE_URL', () => {
    const sinDatabaseUrl: Record<string, unknown> = { ...ENV_VALIDO };
    delete sinDatabaseUrl.DATABASE_URL;
    expect(() => validate(sinDatabaseUrl)).toThrow(
      /Configuración de entorno inválida/,
    );
  });

  it('falla si JWT_SECRET es muy corto', () => {
    expect(() => validate({ ...ENV_VALIDO, JWT_SECRET: 'corto' })).toThrow();
  });

  it('falla si DATABASE_URL no es una URL postgres válida', () => {
    expect(() =>
      validate({ ...ENV_VALIDO, DATABASE_URL: 'no-es-una-url' }),
    ).toThrow();
  });
});
