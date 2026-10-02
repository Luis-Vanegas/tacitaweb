import { Controller, Get, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Compromiso } from '@/database/entities/compromiso.entity';

// ponytail: solo lectura y sin service aparte — es un findAll. Cuando se
// editen desde la app (cambiar estado, avance) se separa en service + DTO.
@Controller('compromisos')
export class CompromisosController {
  constructor(
    @InjectRepository(Compromiso)
    private readonly compromisoRepository: Repository<Compromiso>,
  ) {}

  // Los que vencen primero arriba; sin fecha al final.
  @Get()
  listar() {
    return this.compromisoRepository.find({
      order: {
        fechaCumplimiento: { direction: 'ASC', nulls: 'LAST' },
        id: 'ASC',
      },
    });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Compromiso])],
  controllers: [CompromisosController],
})
export class CompromisosModule {}
