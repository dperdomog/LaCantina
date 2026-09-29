// Torneos ganados por el equipo (se oculta si no hay ninguno)
export default function TeamTrophies({ trophies }) {
  if (!trophies?.length) return null;
  return (
    <div className="sticker bg-yellow text-on-color p-6 md:p-8 mb-8">
      <h2 className="font-display text-[30px] leading-none">🏆 Trofeos</h2>
      <div className="flex flex-col gap-3 mt-5">
        {trophies.map(t => (
          <a key={t.id} href={`/torneos/${t.id}`}
            className="flex items-center justify-between gap-3 flex-wrap bg-white border-[3px] border-[#1c1c1c] rounded-2xl px-4 py-3 no-underline text-[#1c1c1c] hover:-translate-y-0.5 transition-transform">
            <span className="font-display text-[18px]">🥇 {t.name}</span>
            {(t.starts_at || t.date_display) && (
              <span className="text-[14px] font-bold">
                {t.starts_at
                  ? new Date(t.starts_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })
                  : t.date_display}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
