// Mapea core.categoria_actividad (005_categoria_actividad.sql). Categoría
// temática de una actividad (Vial, Espacio público, Zonas verdes...), para
// agrupar/filtrar el listado de actividades de un frente.
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Actividad } from './actividad.entity';

@Entity({ name: 'categoria_actividad' })
export class CategoriaActividad {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'smallint' })
  orden!: number;

  @OneToMany(() => Actividad, (actividad) => actividad.categoria)
  actividades!: Actividad[];
}
