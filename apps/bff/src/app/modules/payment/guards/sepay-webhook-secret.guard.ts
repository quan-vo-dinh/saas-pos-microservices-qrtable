import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { assertSepayHmacSignature } from '../verify-sepay-webhook-secret';

@Injectable()
export class SepayWebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();

    const signature = this.header(request, 'x-sepay-signature');
    const timestamp = this.header(request, 'x-sepay-timestamp');
    const rawBody = request.rawBody ?? Buffer.alloc(0);
    const secret = this.configService.get<string>('SEPAY_WEBHOOK_SECRET') || process.env['SEPAY_WEBHOOK_SECRET'] || '';

    assertSepayHmacSignature(signature, timestamp, rawBody, secret);
    return true;
  }

  private header(request: Request, name: string): string | undefined {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
