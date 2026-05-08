import { Injectable } from '@nestjs/common';

const BILL_REFERENCE_REGEX = /QRTBL[A-Z0-9]{8}/i;

@Injectable()
export class PaymentReferenceService {
  createBillReference(billId: string): string {
    return `QRTBL${billId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  createCollisionFallbackReference(billId: string): string {
    return `QRTBL${billId.replace(/-/g, '').slice(8, 16).toUpperCase()}`;
  }

  extractBillReference(input: { code?: string | null; content?: string | null }): string | null {
    const code = input.code?.trim().toUpperCase();
    if (code) {
      const match = code.match(BILL_REFERENCE_REGEX);
      if (match) {
        return match[0].toUpperCase();
      }
    }

    const content = input.content?.trim() ?? '';
    return content.match(BILL_REFERENCE_REGEX)?.[0]?.toUpperCase() ?? null;
  }

  buildQrUrl(input: { account: string; bank: string; amount: number; description: string }): string {
    const params = new URLSearchParams({
      acc: input.account,
      bank: input.bank,
      amount: String(input.amount),
      des: input.description,
    });
    return `https://qr.sepay.vn/img?${params.toString()}`;
  }
}
