import { DataSource } from 'typeorm';
import { ejecutarConAuditoria } from './auditoria.helper';

describe('ejecutarConAuditoria', () => {
  function crearQueryRunner() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      manager: {},
    };
  }

  it('fija app.usuario_id, comitea y devuelve el resultado de fn', async () => {
    const queryRunner = crearQueryRunner();
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;

    const resultado = await ejecutarConAuditoria(
      dataSource,
      'u1',
      async (manager) => {
        expect(manager).toBe(queryRunner.manager);
        return 'ok';
      },
    );

    expect(resultado).toBe('ok');
    expect(queryRunner.query).toHaveBeenCalledWith(
      'select set_config($1, $2, true)',
      ['app.usuario_id', 'u1'],
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('hace rollback y relanza el error si fn falla', async () => {
    const queryRunner = crearQueryRunner();
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;

    await expect(
      ejecutarConAuditoria(dataSource, 'u1', async () => {
        throw new Error('falló la escritura');
      }),
    ).rejects.toThrow('falló la escritura');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('usa string vacío cuando usuarioId es null', async () => {
    const queryRunner = crearQueryRunner();
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;

    await ejecutarConAuditoria(dataSource, null, async () => undefined);

    expect(queryRunner.query).toHaveBeenCalledWith(
      'select set_config($1, $2, true)',
      ['app.usuario_id', ''],
    );
  });
});
