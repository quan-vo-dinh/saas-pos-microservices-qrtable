import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { TooltipProvider } from '@einvoice/frontend-ui';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'QRTable Management App',
  description: 'Management dashboard shell for QRTable SaaS POS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
