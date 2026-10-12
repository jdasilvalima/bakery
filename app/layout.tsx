import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next, IBM_Plex_Mono, Young_Serif } from 'next/font/google';
import './globals.css';

const youngSerif = Young_Serif({ weight: '400', subsets: ['latin'], variable: '--font-young-serif' });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson', adjustFontFallback: false });
const plexMono = IBM_Plex_Mono({ weight: ['500', '600'], subsets: ['latin'], variable: '--font-plex-mono' });

export const metadata: Metadata = {
  title: { default: 'Bakery Traceability', template: '%s · Bakery Traceability' },
  description: 'Lot traceability from delivery to packed product.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${youngSerif.variable} ${atkinson.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
