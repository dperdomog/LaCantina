import { Anton, Manrope, IBM_Plex_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'La Cantina — Comunidad Deadlock LATAM',
  description:
    'Discord activo 24/7, consigue gente con quien jugar. Gratis y en Español.',
  openGraph: {
    title: 'La Cantina — Comunidad Deadlock LATAM',
    description: 'Discord activo 24/7, consigue gente con quien jugar. Gratis y en Español.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${anton.variable} ${manrope.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-[#06070a] text-[#f1ede5] font-manrope overflow-x-hidden">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
