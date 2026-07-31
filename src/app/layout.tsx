import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Windy — Qualité de l\'air en temps réel',
  description:
    'Carte interactive de la qualité de l\'air : AQI, PM2.5, PM10, NO₂, O₃, SO₂ et CO en temps réel pour les villes du monde.',
  keywords: ['qualité air', 'AQI', 'pollution', 'carte', 'environnement', 'météo'],
  openGraph: {
    title: 'Windy — Qualité de l\'air',
    description: 'Carte interactive de surveillance de la qualité de l\'air.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
