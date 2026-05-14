'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { cn } from '@/lib/utils';
import { TechPlatformSection } from '@/features/landing/tech-platform-section';

/** Mục công nghệ landing: ẩn mặc định; mở bằng [Rainbow Button](https://magicui.design/docs/components/rainbow-button) cố định góc phải dưới. */
export function TechPlatformReveal(): ReactElement {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const syncFromHash = () => {
      if (typeof window === 'undefined') return;
      setOpen(window.location.hash === '#tech-platform');
    };
    const initialId = window.setTimeout(syncFromHash, 0);
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.clearTimeout(initialId);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      document.getElementById('tech-platform')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(id);
  }, [open]);

  const openAndScroll = useCallback(() => {
    setOpen(true);
    if (typeof window !== 'undefined' && window.location.hash !== '#tech-platform') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#tech-platform`);
    }
  }, []);

  const collapse = useCallback(() => {
    setOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#tech-platform') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  return (
    <>
      <RainbowButton
        type="button"
        variant={open ? 'outline' : 'default'}
        size="sm"
        className={cn(
          'fixed z-50 max-w-[min(92vw,22rem)] shadow-lg',
          'bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]',
          'whitespace-normal px-3 py-2.5 text-right text-xs leading-snug sm:text-sm',
        )}
        onClick={open ? collapse : openAndScroll}
      >
        {open ? 'Thu gọn mục công nghệ' : 'Bạn tò mò về công nghệ mà dự án triển khai?'}
      </RainbowButton>

      {open ? <TechPlatformSection /> : null}
    </>
  );
}
