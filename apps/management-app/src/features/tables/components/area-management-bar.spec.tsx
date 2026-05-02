import { fireEvent, render, screen } from '@testing-library/react';
import type { Area } from '../data/schema';
import { TablesProvider, useTables } from './tables-provider';
import { AreaManagementBar } from './area-management-bar';

function Probe(): React.ReactElement {
  const { open, currentArea } = useTables();
  return (
    <div>
      <span data-testid="open">{open ?? ''}</span>
      <span data-testid="current-area">{currentArea?.id ?? ''}</span>
    </div>
  );
}

function renderBar(areas: Area[]) {
  return render(
    <TablesProvider>
      <AreaManagementBar areas={areas} />
      <Probe />
    </TablesProvider>,
  );
}

describe('AreaManagementBar', () => {
  const areas: Area[] = [
    { id: 'area-1', name: 'Tầng trệt', sortOrder: 0, tableCount: 3 },
    { id: 'area-2', name: 'Sân vườn', sortOrder: 1, tableCount: 0 },
  ];

  it('opens edit dialog with selected area', () => {
    renderBar(areas);

    fireEvent.click(screen.getByLabelText('Edit area Tầng trệt'));

    expect(screen.getByTestId('open').textContent).toBe('edit-area');
    expect(screen.getByTestId('current-area').textContent).toBe('area-1');
  });

  it('disables delete for areas that still have tables', () => {
    renderBar(areas);

    expect((screen.getByLabelText('Delete area Tầng trệt') as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens delete dialog for empty area', () => {
    renderBar(areas);

    fireEvent.click(screen.getByLabelText('Delete area Sân vườn'));

    expect(screen.getByTestId('open').textContent).toBe('delete-area');
    expect(screen.getByTestId('current-area').textContent).toBe('area-2');
  });
});
