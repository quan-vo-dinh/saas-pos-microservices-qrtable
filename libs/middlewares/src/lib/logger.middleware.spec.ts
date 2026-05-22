import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LoggerMiddleware } from './logger.middleware';

jest.mock('@common/utils/string.util', () => ({
  getProcessId: jest.fn(() => 'logger-process-id'),
}));

function createRequest(body: unknown): Request {
  return {
    method: 'POST',
    originalUrl: '/auth/login',
    body,
  } as Request;
}

function createResponse(): Response {
  const response = {
    send: jest.fn(),
  } as unknown as Response;

  (response.send as jest.Mock).mockReturnValue(response);

  return response;
}

describe('LoggerMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts secret-like request body fields before logging', () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation();
    const body = {
      username: 'staff@example.com',
      password: 'raw-password',
      profile: {
        displayName: 'Staff User',
        token: 'nested-token',
      },
      headers: {
        authorization: 'Bearer raw-jwt',
        cookie: 'sid=raw-cookie',
      },
      integrations: [
        { name: 'sepay', apiKey: 'raw-api-key' },
        { name: 'legacy', api_key: 'raw-api-key-2' },
      ],
      notes: ['keep-this-visible'],
    };
    const req = createRequest(body);
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    new LoggerMiddleware().use(req, res, next);

    const logOutput = JSON.stringify(logSpy.mock.calls);
    expect(logOutput).toContain('[REDACTED]');
    expect(logOutput).not.toContain('raw-password');
    expect(logOutput).not.toContain('nested-token');
    expect(logOutput).not.toContain('Bearer raw-jwt');
    expect(logOutput).not.toContain('sid=raw-cookie');
    expect(logOutput).not.toContain('raw-api-key');
    expect(logOutput).not.toContain('raw-api-key-2');
  });

  it('keeps normal non-secret request body fields visible in logs', () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation();
    const req = createRequest({
      username: 'staff@example.com',
      profile: { displayName: 'Staff User' },
      notes: ['keep-this-visible'],
    });
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    new LoggerMiddleware().use(req, res, next);

    const logOutput = JSON.stringify(logSpy.mock.calls);
    expect(logOutput).toContain('staff@example.com');
    expect(logOutput).toContain('Staff User');
    expect(logOutput).toContain('keep-this-visible');
  });

  it('does not call console.log', () => {
    jest.spyOn(Logger, 'log').mockImplementation();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const req = createRequest({ username: 'staff@example.com' });
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    new LoggerMiddleware().use(req, res, next);

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
