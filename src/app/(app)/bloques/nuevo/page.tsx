import { BlockForm } from '@/components/BlockForm';

export default function NuevoBloquePage() {
  return (
    <div className="animate-slide-up">
      <h1 className="mb-6 font-display text-2xl font-bold text-white">
        Nuevo bloque de enfoque
      </h1>
      <BlockForm />
    </div>
  );
}
