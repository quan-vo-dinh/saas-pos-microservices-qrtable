import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('KDS board policy', () => {
  const kdsDir = join(__dirname, '..');
  const boardSource = readFileSync(join(kdsDir, 'kds-board.tsx'), 'utf8');
  const cardSource = readFileSync(join(kdsDir, 'kds-ticket-card.tsx'), 'utf8');
  const columnSource = readFileSync(join(kdsDir, 'kds-column.tsx'), 'utf8');
  const dndSource = readFileSync(join(kdsDir, 'kds-dnd-wrapper.tsx'), 'utf8');
  const headerSource = readFileSync(join(kdsDir, 'kds-header.tsx'), 'utf8');
  const sheetSource = readFileSync(join(kdsDir, 'kds-ticket-sheet.tsx'), 'utf8');
  const storeSource = readFileSync(join(kdsDir, '../../mocks/store.ts'), 'utf8');
  const realtimePillSource = readFileSync(join(kdsDir, '../realtime/realtime-status-pill.tsx'), 'utf8');

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

  it('uses management theme tokens on live-visible KDS surfaces', () => {
    const liveVisibleSources = [
      boardSource,
      cardSource,
      columnSource,
      dndSource,
      headerSource,
      sheetSource,
      realtimePillSource,
    ].join('\n');

    [
      'data-surface="kds"',
      'var(--lime)',
      'var(--pink)',
      'var(--amber)',
      'var(--ink)',
      'font-kds',
      'bg-black',
      'bg-[#090b10]',
      'border-white',
      'text-white',
    ].forEach((legacyThemeMarker) => {
      expect(liveVisibleSources).not.toContain(legacyThemeMarker);
    });
  });

  it('keeps KDS live controls aligned with the realtime spec', () => {
    expect(headerSource).toContain('aria-label="Làm mới KDS"');
    expect(boardSource).toContain('onRefresh={invalidateQueue}');
    expect(boardSource).toContain('setKdsTicketPriority');
    expect(cardSource).toContain('togglePriority');
  });

  it('does not duplicate keyboard shortcut guards', () => {
    const shortcutGuard = "if (!['1', '2', '3'].includes(e.key)) return;";
    expect(boardSource.split(shortcutGuard)).toHaveLength(2);
  });
});
