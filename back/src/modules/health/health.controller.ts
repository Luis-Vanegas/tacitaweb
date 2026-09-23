// GET /api/v1/health — ping trivial a la BD. Público: se usa para
// healthchecks de infraestructura, no debe exigir JWT.
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '@/common/decorators/public.decorator';

interface HealthResponse {
  status: 'ok';
  db: true;
}

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: true };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: false });
    }
  }
}
