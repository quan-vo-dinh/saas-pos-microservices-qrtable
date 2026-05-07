import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('KDS board policy', () => {
  const kdsDir = join(__dirname, '..');
  const boardSource = readFileSync(join(kdsDir, 'kds-board.tsx'), 'utf8');
  const cardSource = readFileSync(join(kdsDir, 'kds-ticket-card.tsx'), 'utf8');
  const storeSource = readFileSync(join(kdsDir, '../../mocks/store.ts'), 'utf8');

  const legacyPanelFilename = ['kds-', 'batch', 'ing', '-panel.tsx'].join('');
  const legacyPanelComponent = ['Kds', 'Batch', 'ing', 'Panel'].join('');
  const highlightStateKey = ['kds', 'Highlighted', 'Item', 'Name'].join('');
  const highlightSetter = ['set', 'Kds', 'Highlighted', 'Item', 'Name'].join('');

  it('does not ship the stack-side panel module', () => {
    expect(existsSync(join(kdsDir, legacyPanelFilename))).toBe(false);
    expect(boardSource).not.toContain(legacyPanelComponent);
    expect(boardSource).not.toContain(highlightSetter);
  });

  it('does not keep cross-ticket item highlight wiring', () => {
    expect(cardSource).not.toContain(['highlighted', 'Item', 'Name'].join(''));
    expect(storeSource).not.toContain(highlightStateKey);
    expect(storeSource).not.toContain(highlightSetter);
  });
});
