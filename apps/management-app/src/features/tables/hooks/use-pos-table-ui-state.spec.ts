import { usePosTableUiState } from './use-pos-table-ui-state';

describe('usePosTableUiState', () => {
  beforeEach(() => {
    usePosTableUiState.getState().selectTable(null);
  });

  it('stores and clears the selected POS table id', () => {
    usePosTableUiState.getState().selectTable('table-1');
    expect(usePosTableUiState.getState().selectedTableId).toBe('table-1');

    usePosTableUiState.getState().selectTable(null);
    expect(usePosTableUiState.getState().selectedTableId).toBeNull();
  });
});
