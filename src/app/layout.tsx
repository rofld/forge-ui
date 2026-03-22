import type { Metadata } from 'next';
import { JetBrains_Mono, Geist } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/ui/Sidebar';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("h-full", jetbrains.variable, "font-sans", geist.variable)}>
      <body className="h-full bg-zinc-950 text-zinc-100 flex antialiased font-mono">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-hidden flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
