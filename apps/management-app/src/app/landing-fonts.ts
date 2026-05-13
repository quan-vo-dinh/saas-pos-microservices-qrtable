import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';

/** Typography scoped to public landing (`/`) — SaaS-grade sans + technical mono. */
export const landingSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-landing-sans',
  adjustFontFallback: true,
});

export const landingMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-landing-mono',
  adjustFontFallback: true,
});
