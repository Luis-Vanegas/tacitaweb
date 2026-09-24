import { CatalogosService } from './catalogos.service';

describe('CatalogosService', () => {
  let estadoRepo: { find: jest.Mock };
  let dependenciaRepo: { find: jest.Mock };
  let proyectoRepo: { find: jest.Mock };
  let contratistaRepo: { find: jest.Mock };
  let categoriaActividadRepo: { find: jest.Mock };
  let service: CatalogosService;

  beforeEach(() => {
    estadoRepo = { find: jest.fn().mockResolvedValue(['estado']) };
    dependenciaRepo = { find: jest.fn().mockResolvedValue(['dependencia']) };
    proyectoRepo = { find: jest.fn().mockResolvedValue(['proyecto']) };
    contratistaRepo = { find: jest.fn().mockResolvedValue(['contratista']) };
    categoriaActividadRepo = {
      find: jest.fn().mockResolvedValue(['categoria']),
    };

    service = new CatalogosService(
      estadoRepo as any,
      dependenciaRepo as any,
      proyectoRepo as any,
      contratistaRepo as any,
      categoriaActividadRepo as any,
    );
  });

  it('consulta los 5 repos la primera vez', async () => {
    const resultado = await service.obtener();

    expect(resultado).toEqual({
      estados: ['estado'],
      dependencias: ['dependencia'],
      proyectos: ['proyecto'],
      contratistas: ['contratista'],
      categoriasActividad: ['categoria'],
    });
    expect(estadoRepo.find).toHaveBeenCalledTimes(1);
  });

  it('sirve desde cache en la segunda llamada dentro del TTL', async () => {
    await service.obtener();
    await service.obtener();

    expect(estadoRepo.find).toHaveBeenCalledTimes(1);
    expect(dependenciaRepo.find).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar cuando el cache expiró', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await service.obtener();

    jest.setSystemTime(new Date('2026-01-01T00:06:00Z')); // > 5 min TTL
    await service.obtener();

    expect(estadoRepo.find).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
