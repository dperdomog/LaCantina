'use client';

import { useEffect, useState } from 'react';

// Estado de carga de imágenes compartido (algunas imágenes de héroes nuevos todavía no existen
// en deadlock-api.com): null = cargando, true = ok, false = falló.
const cache = new Map();

export function useImageOk(src) {
  const [ok, setOk] = useState(() => (src ? cache.get(src) ?? null : false));
  useEffect(() => {
    if (!src) { setOk(false); return undefined; }
    if (cache.has(src)) { setOk(cache.get(src)); return undefined; }
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';                          // mismo modo que el tablero (ver exportPng)
    img.onload  = () => { cache.set(src, true);  if (alive) setOk(true); };
    img.onerror = () => { cache.set(src, false); if (alive) setOk(false); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return ok;
}
