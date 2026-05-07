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

  it('renders degraded state', () => {
    render(<RealtimeStatusPill status="degraded" />);
    expect(screen.getByText('Realtime gián đoạn')).toBeTruthy();
  });
});
