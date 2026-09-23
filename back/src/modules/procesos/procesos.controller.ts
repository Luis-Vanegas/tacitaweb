import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ProcesosService } from './procesos.service';
import { CrearProcesoDto } from './dto/crear-proceso.dto';
import { ActualizarProcesoDto } from './dto/actualizar-proceso.dto';
import { CambiarEstadoProcesoDto } from './dto/cambiar-estado-proceso.dto';

// POST /procesos/:id/adjuntos (Azure Blob, fase 6) no se toca acá.
@Controller('procesos')
export class ProcesosController {
  constructor(private readonly procesosService: ProcesosService) {}

  @Get(':id')
  obtenerDetalle(@Param('id') id: string) {
    return this.procesosService.obtenerDetalle(id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
  @Post()
  crear(
    @Body() dto: CrearProcesoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.procesosService.crear(dto, actor.id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProcesoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.procesosService.actualizar(id, dto, actor);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoProcesoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.procesosService.cambiarEstado(id, dto, actor);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('id') id: string,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.procesosService.eliminar(id, actor.id);
  }
}
