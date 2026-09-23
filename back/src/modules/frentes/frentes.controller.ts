import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { FrentesService } from './frentes.service';
import { FiltroProcesosFrenteDto } from './dto/filtro-procesos-frente.dto';
import { VincularProcesoFrenteDto } from './dto/vincular-proceso-frente.dto';

// GET /frentes/:slug/export (Excel) queda fuera de esta fase (5/6): no se
// toca acá ni se referencia en el routing.
@Controller('frentes')
export class FrentesController {
  constructor(private readonly frentesService: FrentesService) {}

  @Get()
  listar() {
    return this.frentesService.listar();
  }

  @Get(':slug')
  obtenerDetalle(@Param('slug') slug: string) {
    return this.frentesService.obtenerDetalle(slug);
  }

  @Get(':slug/procesos')
  listarProcesos(
    @Param('slug') slug: string,
    @Query() filtro: FiltroProcesosFrenteDto,
  ) {
    return this.frentesService.listarProcesos(slug, filtro);
  }

  @Get(':slug/personal')
  obtenerPersonal(@Param('slug') slug: string) {
    return this.frentesService.obtenerPersonal(slug);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Put(':slug/procesos/:id')
  vincularProceso(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: VincularProcesoFrenteDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.frentesService.vincularProceso(slug, id, dto, actor.id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Delete(':slug/procesos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  desvincularProceso(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.frentesService.desvincularProceso(slug, id, actor.id);
  }
}
