import TorneoForm from '@/components/admin/TorneoForm';

export const metadata = { title: 'Nuevo torneo — Admin' };

export default function NuevoTorneoPage() {
  return (
    <main className="px-6 md:px-14 py-10">
      <div className="max-w-[720px] mx-auto">
        <span className="mono-label text-yellow text-[10px] block mb-2">// NUEVO TORNEO</span>
        <h1 className="font-display text-[48px] text-ink leading-none mb-10">CREAR TORNEO</h1>
        <TorneoForm />
      </div>
    </main>
  );
}
