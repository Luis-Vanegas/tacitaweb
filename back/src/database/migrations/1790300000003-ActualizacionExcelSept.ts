// Sincroniza con el Excel maestro actualizado (ver
// sql/009_actualizacion_excel_sept.sql): 3 contratos nuevos, avances de
// estado/observación, y cifras de personal 2026.
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class ActualizacionExcelSept1790300000003 implements MigrationInterface {
  name = 'ActualizacionExcelSept1790300000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('009_actualizacion_excel_sept.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Personal 2026: vuelve a las cifras previas.
      update core.personal_corte pc
      set actual = v.actual, pendiente = v.pendiente, observaciones = v.obs
      from (values
        ('Guardaquebradas', 50, 5, 'Parque Arví'),
        ('Jardineros', 0, 600, 'Arví y Jardín Botánico ' || chr(10) || 'En proceso de contratación'),
        ('Espacio Público', 59, null, 'Fundación Pascual Bravo' || chr(10) || '[Comentario Excel] Prórroga hasta el 30 de julio, con recurso disponible, inicia el nuevo contrato el 1 de agosto'),
        ('EMVARIAS', 147, 147, null),
        ('Gestión y Control (promotores puntos críticos)', 196, 25, 'ITM'),
        ('Cuadrillas (EDU)', 16, 464, 'EDU- Pendiente contrato nuevo para aumentar personal')
      ) v(tipo, actual, pendiente, obs)
      join core.tipo_personal t on core.clave_texto(t.nombre) = core.clave_texto(v.tipo)
      where pc.tipo_personal_id = t.id and pc.vigencia = 2026;

      -- Procesos existentes: revierte observación/estado/fecha a lo que tenían.
      update core.proceso_contratacion
      set observacion = null
      where numero_necesidad in ('56185', '56177', '56238', '56182');

      update core.proceso_contratacion p
      set observacion = 'Pendiente de Comité de Contratación EDU'
      from core.actividad a
      where p.actividad_id = a.id and a.nombre = 'Contingencias'
        and p.estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL')
        and p.contratista_id = (select id from core.contratista where core.clave_texto(nombre) = core.clave_texto('EDU'));

      update core.proceso_contratacion p
      set observacion = 'Pendiente Junta Directiva Arví'
      from core.actividad a
      where p.actividad_id = a.id and a.nombre = 'Corredores verdes y jardineros'
        and p.estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL')
        and p.contratista_id = (select id from core.contratista where core.clave_texto(nombre) = core.clave_texto('Parque Arví'));

      update core.proceso_contratacion
      set estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL'),
          observacion = 'Fecha probable de inicio 04/11/2026'
      where numero_necesidad = '56172';

      update core.proceso_contratacion
      set fecha_inicio = null
      where numero_contrato = '4600108890';

      update core.proceso_contratacion
      set estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL'),
          observacion = null,
          link_secop = null
      where numero_necesidad = '56525';

      -- Contratos y actividades nuevos: se borran en orden (frente_proceso -> proceso -> actividad).
      delete from core.frente_proceso fp
      using core.proceso_contratacion p
      where fp.proceso_id = p.id
        and p.numero_contrato in ('4600105505', '4600105503', '4600108859');

      delete from core.proceso_contratacion
      where numero_contrato in ('4600105505', '4600105503', '4600108859');

      delete from core.actividad
      where nombre in ('Parque Berrío', 'Palacé, Plaza Botero y Plazuela Nutibara', 'Economía círcular: orgánicos');
    `);
  }
}
