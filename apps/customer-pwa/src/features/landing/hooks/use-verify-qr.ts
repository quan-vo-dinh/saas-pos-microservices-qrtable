import { useMutation } from '@tanstack/react-query';
import type { ValidateQrRequest, ValidateQrResponse } from '@einvoice/types';
import { sessionService } from '../services/session.service';

export function useVerifyQrMutation() {
  return useMutation<ValidateQrResponse, Error, ValidateQrRequest>({
    mutationFn: sessionService.validateQr,
  });
}
