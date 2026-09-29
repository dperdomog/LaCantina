const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#';

// Aviso para el propio usuario cuando su cuenta está bloqueada
export default function BannedNotice({ reason, className = '' }) {
  return (
    <div className={`sticker bg-pink text-on-color p-6 ${className}`} role="alert">
      <span className="font-display text-[15px] uppercase tracking-wider">🚫 Cuenta bloqueada</span>
      <p className="font-display text-[24px] leading-tight mt-2">Tu cuenta está bloqueada.</p>
      {reason && <p className="text-[15px] mt-2"><b>Motivo:</b> {reason}</p>}
      <p className="text-[15px] mt-2">
        No puedes publicar, crear equipos ni inscribirte en torneos. Si crees que es un error, escríbenos por Discord.
      </p>
      <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
        className="btn bg-white text-[#1c1c1c] btn-sm mt-4">
        Escribir en Discord ↗
      </a>
    </div>
  );
}
