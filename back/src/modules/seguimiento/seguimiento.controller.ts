import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { SeguimientoService } from './seguimiento.service';
import { CrearSeguimientoDto } from './dto/crear-seguimiento.dto';

@Controller('procesos/:procesoId/seguimiento')
export class SeguimientoController {
  constructor(private readonly seguimientoService: SeguimientoService) {}

  @Get()
  listar(@Param('procesoId') procesoId: string) {
    return this.seguimientoService.listar(procesoId);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
  @Post()
  crear(
    @Param('procesoId') procesoId: string,
    @Body() dto: CrearSeguimientoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.seguimientoService.crear(procesoId, dto, actor);
  }
}
