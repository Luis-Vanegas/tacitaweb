import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ImportacionService, TipoImportacion } from './importacion.service';

const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TAMANO_MAXIMO = 5 * 1024 * 1024;

// Solo los campos de multer que se usan (evita depender de @types/multer).
interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@UseGuards(RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.EDITOR)
@Controller('importacion')
export class ImportacionController {
  constructor(private readonly importacionService: ImportacionService) {}

  @Get('plantilla/:tipo')
  async plantilla(
    @Param('tipo', new ParseEnumPipe(TipoImportacion)) tipo: TipoImportacion,
  ): Promise<StreamableFile> {
    const buffer = await this.importacionService.generarPlantilla(tipo);
    return new StreamableFile(buffer, {
      type: MIME_XLSX,
      disposition: `attachment; filename="plantilla-${tipo}.xlsx"`,
    });
  }

  // Sin ?confirmar=true solo valida (vista previa); nada se escribe.
  @Post(':tipo')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO } }),
  )
  importar(
    @Param('tipo', new ParseEnumPipe(TipoImportacion)) tipo: TipoImportacion,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Query('confirmar') confirmar: string | undefined,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    if (!archivo) {
      throw new BadRequestException('Adjunte el archivo en el campo "archivo"');
    }
    // Algunos navegadores mandan application/octet-stream para .xlsx: se
    // acepta por MIME o por extensión; el parser rechaza lo que no sea xlsx.
    const esXlsx =
      archivo.mimetype === MIME_XLSX ||
      archivo.originalname.toLowerCase().endsWith('.xlsx');
    if (!esXlsx) {
      throw new BadRequestException('Solo se aceptan archivos .xlsx');
    }
    return this.importacionService.importar(
      tipo,
      archivo.buffer,
      confirmar === 'true',
      actor,
    );
  }
}
