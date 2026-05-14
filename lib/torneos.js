export const TORNEOS = [
  {
    id:       'street-brawl-s1',
    name:     'Street Brawl — Temporada 1',
    format:   '4v4',
    date:     'Por definir',
    time:     'Por definir',
    status:   'open',
    maxSlots: 32,
    prize:    'Por definir',
    region:   'LATAM',
    featured: true,
  },
];

export function getTorneo(id) {
  return TORNEOS.find(t => t.id === id) ?? null;
}
