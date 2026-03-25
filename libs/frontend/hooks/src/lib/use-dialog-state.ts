import { useState, useCallback } from 'react';

/**
 * Manages open/close state for dialogs with an optional payload.
 *
 * @example
 * const [dialogState, setDialogState] = useDialogState<User>();
 * setDialogState(user);    // open with data
 * setDialogState(null);    // close
 */
export function useDialogState<T>(initialState: T | null = null) {
  const [state, setState] = useState<T | null>(initialState);

  const open = useCallback((value: T) => setState(value), []);
  const close = useCallback(() => setState(null), []);

  return { data: state, isOpen: state !== null, open, close } as const;
}
