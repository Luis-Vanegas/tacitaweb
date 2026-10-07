import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { CompromisosService } from './compromisos.service';
import { ActualizarCompromisoDto } from './dto/actualizar-compromiso.dto';
import { CrearCompromisoDto } from './dto/crear-compromiso.dto';

// Lectura para cualquier usuario autenticado (JwtAuthGuard es global);
// los roles se exigen por método solo en las escrituras.
@Controller('compromisos')
export class CompromisosController {
  constructor(private readonly compromisosService: CompromisosService) {}

  @Get()
  listar() {
    return this.compromisosService.listar();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
  crear(
    @Body() dto: CrearCompromisoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compromisosService.crear(dto, actor);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCompromisoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compromisosService.actualizar(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.compromisosService.eliminar(id, actor);
  }
}
