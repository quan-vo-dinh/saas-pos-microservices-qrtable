import { useMutation } from '@tanstack/react-query';
import type { Session } from '@einvoice/types';
import { sessionService } from '../services/session.service';

export function useJoinSessionMutation() {
  return useMutation<Session, Error, { tableId: string; qrToken: string }>({
    mutationFn: sessionService.joinSession,
  });
}
