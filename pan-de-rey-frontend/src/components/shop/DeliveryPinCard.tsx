import React from 'react';

export function DeliveryPinCard({ pin, status }: { pin: string | null; status: string }) {
  if (status !== 'En Camino' && status !== 'Listo') return null;
  if (!pin) return null; // Safety check in case it's not generated yet

  return (
    <div className="bg-neutral-900 border border-amber-500/30 p-6 rounded-xl text-center shadow-lg mt-6">
      <h3 className="text-amber-400 text-sm font-semibold uppercase tracking-wider mb-2">
        Tu Código de Confirmación
      </h3>
      <p className="text-4xl font-mono font-bold text-white tracking-widest my-2">
        {pin}
      </p>
      <p className="text-xs text-neutral-400">
        Muestra o dicta este código de 4 dígitos al repartidor al recibir tu pedido.
      </p>
    </div>
  );
}
