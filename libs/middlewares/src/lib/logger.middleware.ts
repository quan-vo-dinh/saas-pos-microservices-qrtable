import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getProcessId } from '@common/utils/string.util';
import { MetadataKey } from '@common/constants/common.constant';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body } = req;
    const processId = getProcessId('logger');
    const now = new Date();

    (req as any)[MetadataKey.PROCESSID] = processId;
    (req as any)[MetadataKey.STARTTIME] = startTime;

    // dùng để log request đến server
    console.log(`[Request] ${method} ${originalUrl} - Body: ${JSON.stringify(body)}`);

    Logger.log(
      `HTTP >> Start ProcessId: '${processId}' >> method: '${method}' >> url: '${originalUrl}' >> at: '${now.toISOString()}' >> input: '${JSON.stringify(
        body,
      )}'`,
    );

    // khi express trả response về cho user thì nó sẽ gọi hàm res.send, vậy nên ta sẽ override hàm này để log response
    const originalSend = res.send.bind(res);
    res.send = (body?: any): Response => {
      const responseTime = Date.now() - startTime;

      Logger.log(
        `HTTP << End ProcessId: '${processId}' << method: '${method}' << url: '${originalUrl}' << at: '${now.toISOString()}' << responseTime: '${responseTime} ms'`,
      );

      return originalSend(body);
    };
    next();
  }
}
