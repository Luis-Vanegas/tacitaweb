// Envuelve la API Nest (Express por debajo) para correr como función
// serverless de Netlify, con serverless-http (formato "handler" clásico,
// soportado por Netlify además del nuevo Request/Response — ver
// docs.netlify.com/build/frameworks/framework-setup-guides/express).
//
// A propósito importa el código YA COMPILADO en back/dist/ (generado por
// `npm run build`, el mismo build command que usa producción normal) en vez
// de requerir src/app-factory.ts directo: el resto del backend usa
// decoradores de Nest + el alias de import `@/...`, que el bundler de
// funciones de Netlify (esbuild) no resuelve sin config adicional. El JS
// compilado en dist/ ya no tiene decoradores ni alias sin resolver, así que
// el bundler solo sigue requires de JS commonjs normales.
import serverless from 'serverless-http';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handlerPromise: Promise<any> | null = null;

// Cachea la promesa a nivel de módulo (fuera del handler exportado): en una
// invocación "caliente" (mismo contenedor reusado) Netlify vuelve a llamar a
// este módulo ya cargado, así que la app Nest y su conexión a Supabase se
// crean una sola vez y se reusan entre requests, no en cada invocación.
async function crearHandler() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { crearApp } = require('../../dist/app-factory');
  const app = await crearApp();
  await app.init();
  const expressInstance = app.getHttpAdapter().getInstance();
  return serverless(expressInstance);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: any, context: any) => {
  if (!handlerPromise) {
    handlerPromise = crearHandler();
  }
  const h = await handlerPromise;
  return h(event, context);
};
