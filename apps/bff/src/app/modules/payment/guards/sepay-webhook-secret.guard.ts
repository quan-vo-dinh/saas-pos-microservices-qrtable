import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { assertSepayWebhookSecret } from '../verify-sepay-webhook-secret';

@Injectable()
export class SepayWebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-secret-key'];
    const secretKey = Array.isArray(provided) ? provided[0] : provided;
    const expected =
      this.configService.get<string>('SEPAY_WEBHOOK_SECRET') || process.env['SEPAY_WEBHOOK_SECRET'] || '';

    assertSepayWebhookSecret(secretKey, expected);
    return true;
  }
}
