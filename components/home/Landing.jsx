import HeroStreams from '@/components/home/HeroStreams';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';
const STRIPES = ['#00d97e', '#00c8f0', '#ffd400', '#ff7043', '#ff2d2d'];
const external = { target: '_blank', rel: 'noopener noreferrer' };

const fmt = n => n.toLocaleString('es-MX');
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;

function Avatar({ src, name, size = 52 }) {
  const color = STRIPES[(name ?? '?').charCodeAt(0) % STRIPES.length];
  return src
    ? <img src={src} alt="" style={{ width: size, height: size }} className="rounded-full border-[3px] border-line object-cover bg-surface" />
    : <span style={{ width: size, height: size, background: color }}
        className="font-display rounded-full border-[3px] border-line inline-flex items-center justify-center text-on-color">
        {(name ?? '?')[0].toUpperCase()}
      </span>;
}

function CardLabel({ children }) {
  return <span className="font-display text-[15px] uppercase tracking-wider">{children}</span>;
}

export default function Landing({ data }) {
  const { next } = data;
  const teams   = data.teams.filter(t => t.members < 6).slice(0, 4);
  const players = data.players;
  const ticker  = [
    plural(data.members, 'miembro', 'miembros'), `${fmt(data.online)} en línea`,
    plural(data.playerCount, 'jugador', 'jugadores'), plural(data.teams.length, 'equipo', 'equipos'),
    'Gratis y en español', 'Deadlock LATAM',
  ];

  return (
    <main>
      {/* ── Hero ── */}
      <section id="hero" className="max-w-[1180px] mx-auto px-5 pt-14 md:pt-20 pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 bg-surface border-[3px] border-line rounded-full px-4 py-1.5 shadow-sticker-sm text-[14px] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse" />
            {fmt(data.online)} jugando ahora mismo
          </span>
          <h1 className="font-display text-[clamp(44px,6.6vw,84px)] leading-[0.98] tracking-[-0.02em] mt-6">
            La cantina de{' '}
            <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">Deadlock</mark>
            <br />en LATAM.
          </h1>
          <p className="text-[19px] leading-relaxed mt-6 max-w-[500px] text-ink-dim">
            Pasa, pide algo y busca con quién jugar. Torneos, equipos y un Discord que no duerme. Gratis y en español.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <a href={DISCORD_INVITE} {...external} className="btn btn-primary text-[17px]">Unirme al Discord ↗</a>
            <a href="/torneos" className="btn btn-secondary text-[17px]">Ver torneos</a>
          </div>
        </div>

        <div className="sticker p-4 md:p-5 rotate-1">
          <HeroStreams />
        </div>
      </section>

      {/* ── Cinta ── */}
      <div className="border-y-[3px] border-line bg-[#1c1c1c] overflow-hidden py-3">
        <div className="flex w-max animate-ticker">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => (
            <span key={i} className="font-display text-[#f6efe2] text-[22px] px-6 whitespace-nowrap">
              {t} <span style={{ color: STRIPES[i % 5] }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── ¿Qué está pasando? ── */}
      <section className="max-w-[1180px] mx-auto px-5 py-20">
        <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-none">¿Qué está pasando?</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">

          {/* Próximo torneo */}
          <div className="sticker bg-yellow text-on-color p-8 md:col-span-2 flex flex-col">
            <CardLabel>🏆 Próximo torneo</CardLabel>
            {next ? (
              <>
                <h3 className="font-display text-[clamp(28px,4vw,44px)] leading-[1.05] mt-3">{next.name}</h3>
                <div className="flex flex-wrap gap-2 mt-4">
                  {[next.format, next.date_display, next.time_display, next.region].filter(Boolean).map(p => (
                    <span key={p} className="bg-white border-2 border-[#1c1c1c] rounded-full px-3 py-1 text-[14px] font-bold">{p}</span>
                  ))}
                </div>
                <div className="mt-auto pt-8 flex items-end justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between text-[14px] font-bold mb-2"><span>Cupos</span><span>{next.filled}/{next.max_slots}</span></div>
                    <div className="h-4 bg-white border-[3px] border-[#1c1c1c] rounded-full overflow-hidden">
                      <div className="h-full bg-orange" style={{ width: `${Math.min(100, (next.filled / next.max_slots) * 100)}%` }} />
                    </div>
                  </div>
                  <a href={`/torneos/${next.id}`} className="btn bg-[#1c1c1c] text-[#f6efe2] border-[#1c1c1c]">Ver torneo →</a>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-[clamp(28px,4vw,44px)] leading-[1.05] mt-3">Se está cocinando el próximo.</h3>
                <p className="text-[17px] mt-3 max-w-[460px]">Los torneos se anuncian primero en Discord. Entra y activa los avisos para no quedarte afuera.</p>
                <a href={DISCORD_INVITE} {...external} className="btn bg-[#1c1c1c] text-[#f6efe2] border-[#1c1c1c] mt-8 self-start">Avisarme en Discord →</a>
              </>
            )}
          </div>

          {/* Discord */}
          <div className="sticker bg-orange text-on-color p-7 flex flex-col">
            <CardLabel>🍻 Tu mesa te espera</CardLabel>
            <p className="font-display text-[28px] leading-tight mt-4">{fmt(data.online)} personas en el Discord ahora mismo.</p>
            <div className="mt-auto pt-6">
              <a href={DISCORD_INVITE} {...external} className="btn bg-white text-[#1c1c1c]">Entrar al Discord ↗</a>
            </div>
          </div>

          {/* Equipos buscando */}
          <div className="sticker bg-cyan text-on-color p-7">
            <CardLabel>🛡️ Buscan jugadores</CardLabel>
            <div className="flex flex-col gap-3 mt-5">
              {teams.map(t => (
                <a key={t.id} href={`/equipos/${t.slug ?? t.id}`}
                  className="flex items-center justify-between gap-3 bg-white border-[3px] border-[#1c1c1c] rounded-2xl px-4 py-3 no-underline text-[#1c1c1c] hover:-translate-y-0.5 transition-transform">
                  <span className="font-bold truncate">{t.name}</span>
                  <span className="font-display text-[15px] whitespace-nowrap">{t.members}/6</span>
                </a>
              ))}
              {teams.length === 0 && <p className="text-[16px]">Todavía no hay equipos buscando gente.</p>}
            </div>
            <a href="/equipos" className="font-display inline-block mt-4 text-[17px] text-[#1c1c1c] underline decoration-[3px] underline-offset-4">Ver equipos →</a>
          </div>

          {/* Recién llegados */}
          <div className="sticker bg-green text-on-color p-7">
            <CardLabel>👋 Recién llegados</CardLabel>
            <div className="flex -space-x-3 mt-5">
              {players.map(p => (
                <a key={p.id} href={`/jugador/${p.id}`} title={p.display_name ?? p.discord_username}>
                  <Avatar src={p.avatar_url} name={p.display_name ?? p.discord_username} />
                </a>
              ))}
            </div>
            {players.length > 0 && (
              <p className="text-[16px] mt-4">
                <b>{players.slice(0, 3).map(p => p.display_name ?? p.discord_username).join(', ')}</b>
                {data.playerCount > 3 ? ` y ${fmt(data.playerCount - 3)} más ya tienen perfil.` : ' ya tienen perfil.'}
              </p>
            )}
            <a href="/jugadores" className="font-display inline-block mt-4 text-[17px] text-[#1c1c1c] underline decoration-[3px] underline-offset-4">Ver jugadores →</a>
          </div>

          {/* Números */}
          <div className="sticker p-7">
            <CardLabel>📊 La comunidad</CardLabel>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 mt-5">
              {[
                ['Miembros', fmt(data.members)], ['En línea', fmt(data.online)],
                ['Jugadores', fmt(data.playerCount)], ['Equipos', fmt(data.teams.length)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dd className="font-display text-[34px] leading-none">{v}</dd>
                  <dt className="mono-label mt-1.5">{k}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Así de fácil ── */}
      <section className="border-t-[3px] border-line bg-surface">
        <div className="max-w-[1180px] mx-auto px-5 py-20">
          <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-none">Así de fácil.</h2>
          <div className="grid md:grid-cols-3 gap-10 mt-12">
            {[
              ['Conecta tu Discord', 'Un clic y tu perfil queda listo. Sin contraseñas ni formularios.', '#ffd400'],
              ['Arma o únete a un equipo', 'Crea tu equipo e invita gente, o postula a uno que busque jugadores.', '#00c8f0'],
              ['Juega torneos', 'Inscríbete a los torneos de la comunidad y demuestra lo que vale tu equipo.', '#ff2d2d'],
            ].map(([t, d, c], i) => (
              <div key={t}>
                <span className="font-display w-16 h-16 rounded-full border-[3px] border-line shadow-sticker-sm inline-flex items-center justify-center text-[30px] text-on-color"
                  style={{ background: c }}>{i + 1}</span>
                <h3 className="font-display text-[26px] mt-5">{t}</h3>
                <p className="text-[17px] text-ink-dim mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
