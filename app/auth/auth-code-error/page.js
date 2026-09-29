export default function AuthCodeError() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-5 py-14 md:py-20">
      <div className="sticker p-8 md:p-10 text-center max-w-[460px] w-full">
        <span className="font-display w-20 h-20 rounded-full border-[3px] border-line shadow-sticker-sm bg-red text-white inline-flex items-center justify-center text-[44px] leading-none -rotate-6">
          !
        </span>
        <h1 className="font-display text-[clamp(30px,5vw,40px)] leading-[1.05] text-ink mt-6">Uy, no pudimos conectarte</h1>
        <p className="text-ink-dim text-[16px] leading-relaxed mt-3 mb-8">
          No se pudo completar la conexión con Discord. Esto puede pasar si cancelaste la autorización o el enlace expiró.
        </p>
        <a href="/" className="btn btn-primary">Volver al inicio</a>
      </div>
    </main>
  );
}
