import { crearApp } from './app-factory';

async function bootstrap() {
  const app = await crearApp();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
