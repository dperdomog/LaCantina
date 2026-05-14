export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06070a] px-6">
      <div className="text-center max-w-[420px]">
        <p className="font-display text-[64px] text-yellow leading-none mb-4">!</p>
        <h1 className="font-display text-[32px] text-ink mb-3">Error al conectar</h1>
        <p className="text-ink-dim text-[14px] leading-relaxed mb-8">
          No se pudo completar la conexión con Discord. Esto puede pasar si cancelaste la autorización o el enlace expiró.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[14px] no-underline hover:opacity-90 transition-opacity"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
