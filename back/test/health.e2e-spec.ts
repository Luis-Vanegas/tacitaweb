// e2e real: levanta AppModule completo (incluida la conexión a Postgres) y
// pega contra GET /api/v1/health. Requiere DATABASE_URL (+ resto del env)
// apuntando a una BD real ya migrada — se corre contra docker-compose.test.yml,
// nunca contra Supabase. Si no hay Docker disponible en el entorno, este
// archivo se deja documentado pero no se ejecuta (ver reporte de la fase).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health devuelve 200 y db:true', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', db: true });
  });
});
