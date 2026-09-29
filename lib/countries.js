// Países de la comunidad (código guardado en profiles.country y lfg_posts.country)
export const COUNTRIES = [
  ['AR', 'Argentina', '🇦🇷'], ['BO', 'Bolivia', '🇧🇴'], ['BR', 'Brasil', '🇧🇷'], ['CL', 'Chile', '🇨🇱'],
  ['CO', 'Colombia', '🇨🇴'], ['CR', 'Costa Rica', '🇨🇷'], ['CU', 'Cuba', '🇨🇺'], ['EC', 'Ecuador', '🇪🇨'],
  ['SV', 'El Salvador', '🇸🇻'], ['GT', 'Guatemala', '🇬🇹'], ['HN', 'Honduras', '🇭🇳'], ['MX', 'México', '🇲🇽'],
  ['NI', 'Nicaragua', '🇳🇮'], ['PA', 'Panamá', '🇵🇦'], ['PY', 'Paraguay', '🇵🇾'], ['PE', 'Perú', '🇵🇪'],
  ['PR', 'Puerto Rico', '🇵🇷'], ['DO', 'República Dominicana', '🇩🇴'], ['UY', 'Uruguay', '🇺🇾'], ['VE', 'Venezuela', '🇻🇪'],
  ['ES', 'España', '🇪🇸'], ['US', 'Estados Unidos', '🇺🇸'], ['XX', 'Otro', '🌎'],
].map(([code, name, flag]) => ({ code, name, flag }));

export const countryInfo = code => COUNTRIES.find(c => c.code === code) ?? null;
export const isCountry   = code => COUNTRIES.some(c => c.code === code);
