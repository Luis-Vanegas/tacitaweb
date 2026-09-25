// Script interactivo para crear el primer usuario ADMIN (sin uno no hay forma
// de entrar a /usuarios y crear al resto). Corre fuera de Nest, con el mismo
// DataSource standalone que usa la CLI de migraciones (../data-source.ts):
// mismas rutas relativas, sin el alias @/ (no se registra tsconfig-paths acá).
//
//   npm run crear-admin
//
// Email y nombre se piden con readline normal; el password se pide con un
// prompt enmascarado hecho a mano en modo raw de stdin (stdlib de Node, sin
// instalar un paquete de "password prompt" solo para esto).
import 'dotenv/config';
import * as readline from 'node:readline';
import * as bcrypt from 'bcryptjs';
import AppDataSource from '../data-source';
import { RolUsuario, Usuario } from '../entities/usuario.entity';

const RONDAS_BCRYPT = 10;
const PASSWORD_MIN_LENGTH = 8;

function preguntar(rl: readline.Interface, pregunta: string): Promise<string> {
  return new Promise((resolve) => rl.question(pregunta, resolve));
}

function preguntarPassword(pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let password = '';

    stdout.write(pregunta);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (char: string): void => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          stdout.write('\n');
          process.exit(130);
          break;
        case '\u007f': // Backspace
          password = password.slice(0, -1);
          stdout.write('\b \b');
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const email = (await preguntar(rl, 'Email: ')).trim().toLowerCase();
  const nombre = (await preguntar(rl, 'Nombre: ')).trim();
  const rolInput = (await preguntar(rl, 'Rol (ADMIN/EDITOR/LECTOR) [LECTOR]: '))
    .trim()
    .toUpperCase();
  rl.close();

  if (!email || !nombre) {
    console.error('Email y nombre son obligatorios.');
    process.exit(1);
  }
  const rol = rolInput === '' ? RolUsuario.LECTOR : (rolInput as RolUsuario);
  if (!Object.values(RolUsuario).includes(rol)) {
    console.error(`Rol inválido: "${rolInput}". Usá ADMIN, EDITOR o LECTOR.`);
    process.exit(1);
  }

  const password = await preguntarPassword(
    `Password (mínimo ${PASSWORD_MIN_LENGTH} caracteres): `,
  );
  if (password.length < PASSWORD_MIN_LENGTH) {
    console.error(
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
    process.exit(1);
  }
  const confirmacion = await preguntarPassword('Repetí el password: ');
  if (password !== confirmacion) {
    console.error('Las contraseñas no coinciden.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);

  const dataSource = await AppDataSource.initialize();
  try {
    const repositorio = dataSource.getRepository(Usuario);
    const existente = await repositorio.findOne({ where: { email } });
    if (existente) {
      console.error(
        `Ya existe un usuario con ese email (rol actual: ${existente.rol}).`,
      );
      process.exit(1);
    }

    const usuario = repositorio.create({
      email,
      nombre,
      passwordHash,
      rol,
      activo: true,
    });
    const guardado = await repositorio.save(usuario);
    console.log(
      `Usuario ${guardado.rol} creado: ${guardado.email} (${guardado.id})`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Error creando el admin:', error);
  process.exit(1);
});
