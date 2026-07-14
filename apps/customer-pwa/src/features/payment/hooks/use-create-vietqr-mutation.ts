import { useMutation } from '@tanstack/react-query';
import { paymentService } from '../services/payment.service';

export function useCreateVietQrMutation() {
  return useMutation({ mutationFn: () => paymentService.createVietQrForCurrentBill() });
}
