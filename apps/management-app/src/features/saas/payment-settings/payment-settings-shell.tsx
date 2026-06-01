'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';

const SEPAY_LANDING_PREVIEW = '/brands/sepay-landing-preview.png';

type PaymentSettingsShellProps = {
  children: ReactNode;
  hero: ReactNode;
};

export function PaymentSettingsShell({ hero, children }: PaymentSettingsShellProps) {
  return (
    <div className="-mx-4 -mt-4 flex min-h-[calc(100dvh-4rem)] flex-col md:-mx-6 md:-mt-6 lg:grid lg:grid-cols-2 lg:gap-0">
      <div className="flex w-full flex-col gap-6 px-4 py-6 md:px-6 lg:items-start">
        {hero}
        {children}
      </div>

      <div className="relative hidden min-h-[calc(100dvh-4rem)] lg:block" aria-hidden>
        <Image
          src={SEPAY_LANDING_PREVIEW}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-left-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background from-0% via-background/40 via-[18%] to-transparent to-[45%]" />
      </div>
    </div>
  );
}
