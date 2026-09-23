import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function crearHost(response: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('deja pasar una HttpException de Nest tal cual', () => {
    filter.catch(new BadRequestException('dato inválido'), crearHost(response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('mapea unique_violation (23505) a 409', () => {
    filter.catch({ code: '23505' }, crearHost(response));
    expect(response.status).toHaveBeenCalledWith(409);
  });

  it('mapea foreign_key_violation (23503) a 409', () => {
    filter.catch({ code: '23503' }, crearHost(response));
    expect(response.status).toHaveBeenCalledWith(409);
  });

  it('mapea check_violation (23514) a 400', () => {
    filter.catch({ code: '23514' }, crearHost(response));
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it('cualquier otro error cae a 500 sin filtrar detalles', () => {
    filter.catch(new Error('boom interno secreto'), crearHost(response));

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0];
    expect(body.message).not.toContain('secreto');
  });
});
