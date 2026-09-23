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
  StreamableFile,
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

  @Get(':slug/export')
  async exportar(@Param('slug') slug: string): Promise<StreamableFile> {
    const buffer = await this.frentesService.exportarExcel(slug);
    const fecha = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${slug}-${fecha}.xlsx"`,
    });
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
