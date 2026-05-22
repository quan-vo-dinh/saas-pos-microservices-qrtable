import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getProcessId } from '@common/utils/string.util';
import { MetadataKey } from '@common/constants/common.constant';

const REDACTED = '[REDACTED]';
const SECRET_FIELD_PATTERN = /(password|token|secret|authorization|cookie|api[-_]?key)/i;

function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      SECRET_FIELD_PATTERN.test(key) ? REDACTED : redactLogValue(child),
    ]),
  );
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body } = req;
    const processId = getProcessId('logger');
    const now = new Date();
    const requestWithMetadata = req as Request & Record<MetadataKey, unknown>;
    const redactedBody = redactLogValue(body);

    requestWithMetadata[MetadataKey.PROCESSID] = processId;
    requestWithMetadata[MetadataKey.STARTTIME] = startTime;

    Logger.log(
      `HTTP >> Start ProcessId: '${processId}' >> method: '${method}' >> url: '${originalUrl}' >> at: '${now.toISOString()}' >> input: '${JSON.stringify(
        redactedBody,
      )}'`,
    );

    // khi express trả response về cho user thì nó sẽ gọi hàm res.send, vậy nên ta sẽ override hàm này để log response
    const originalSend = res.send.bind(res);
    res.send = ((responseBody?: unknown): Response => {
      const responseTime = Date.now() - startTime;

      Logger.log(
        `HTTP << End ProcessId: '${processId}' << method: '${method}' << url: '${originalUrl}' << at: '${now.toISOString()}' << responseTime: '${responseTime} ms'`,
      );

      return originalSend(responseBody);
    }) as Response['send'];
    next();
  }
}
