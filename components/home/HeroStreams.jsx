'use client';

import dynamic from 'next/dynamic';

// El reproductor usa window.location para el parámetro "parent" de Twitch: solo cliente
const TwitchCarousel = dynamic(() => import('@/components/TwitchCarousel'), { ssr: false });

export default function HeroStreams() {
  return <TwitchCarousel />;
}
