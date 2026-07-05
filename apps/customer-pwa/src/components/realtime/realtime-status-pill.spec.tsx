import { render, screen } from '@testing-library/react';
import { RealtimeStatusPill } from './realtime-status-pill';

describe('RealtimeStatusPill', () => {
  it('renders nothing when connected', () => {
    const { container } = render(<RealtimeStatusPill status="connected" />);
    expect(container.textContent).toBe('');
  });

  it('renders reconnecting and auth error states', () => {
    const { rerender } = render(<RealtimeStatusPill status="reconnecting" />);
    expect(screen.getByText('Đang kết nối lại')).toBeTruthy();

    rerender(<RealtimeStatusPill status="auth-error" />);
    expect(screen.getByText('Lỗi phiên realtime')).toBeTruthy();
  });

  it('does not render for degraded state', () => {
    const { container } = render(<RealtimeStatusPill status="degraded" />);
    expect(container.textContent).toBe('');
  });
});
