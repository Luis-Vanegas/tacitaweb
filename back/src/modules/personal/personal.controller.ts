import {
  Body,
  Controller,
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
import { PersonalService } from './personal.service';
import { ActualizarCortePersonalDto } from './dto/actualizar-corte-personal.dto';
import { CrearCortePersonalDto } from './dto/crear-corte-personal.dto';

@UseGuards(RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  @Patch('cortes/:id')
  actualizarCorte(
    @Param('id') id: string,
    @Body() dto: ActualizarCortePersonalDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.personalService.actualizarCorte(id, dto, actor);
  }

  @Post('cortes')
  crearCorte(
    @Body() dto: CrearCortePersonalDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.personalService.crearCorte(dto, actor);
  }
}
