import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import SidebarWrapper from '@/components/ui/SidebarWrapper';
import LayoutShell from '@/components/ui/LayoutShell';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Forge UI',
  description: 'Web interface for the forge agent platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full ${spaceGrotesk.variable} ${jetbrains.variable}`} data-theme="ember-dark" data-color="ember" suppressHydrationWarning>
      <body className="h-full bg-background text-foreground flex antialiased font-sans">
        <LayoutShell sidebar={<SidebarWrapper />}>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
