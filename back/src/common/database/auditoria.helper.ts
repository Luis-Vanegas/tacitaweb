// Toda escritura de negocio pasa por acá: abre una transacción, fija
// app.usuario_id (lo lee el trigger core.registrar_auditoria()) y ejecuta la
// función dada con el EntityManager de esa transacción. Comitea si todo sale
// bien, hace rollback si algo lanza.
import { DataSource, EntityManager } from 'typeorm';

export async function ejecutarConAuditoria<T>(
  dataSource: DataSource,
  usuarioId: string | null,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // `true` = local a la transacción (set_config(..., ..., true)); se limpia sola al comitear/rollback.
    await queryRunner.query('select set_config($1, $2, true)', [
      'app.usuario_id',
      usuarioId ?? '',
    ]);

    const resultado = await fn(queryRunner.manager);

    await queryRunner.commitTransaction();
    return resultado;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
