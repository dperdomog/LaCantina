import { Fredoka, DM_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
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

// Aplica el tema guardado antes de pintar, para evitar un parpadeo
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-ink font-body overflow-x-hidden">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
