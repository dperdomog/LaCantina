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
    'El punto de encuentro de la escena competitiva de Deadlock en Latinoamérica. Torneos, comunidad y mucho más.',
  openGraph: {
    title: 'La Cantina — Comunidad Deadlock LATAM',
    description: 'Torneos, comunidad y competencia de Deadlock en LATAM.',
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
