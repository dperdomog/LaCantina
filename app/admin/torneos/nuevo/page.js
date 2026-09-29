import TorneoForm from '@/components/admin/TorneoForm';

export const metadata = { title: 'Nuevo torneo — Admin' };

export default function NuevoTorneoPage() {
  return (
    <main className="max-w-[1180px] mx-auto px-5 py-10">
      <div className="max-w-[720px] mx-auto">
        <span className="mono-label block mb-2">Nuevo torneo</span>
        <h1 className="font-display text-[clamp(32px,4vw,48px)] text-ink leading-none mb-8">Crear torneo</h1>
        <div className="sticker p-6">
          <TorneoForm />
        </div>
      </div>
    </main>
  );
}
