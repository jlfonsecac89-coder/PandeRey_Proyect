// Motivos de cancelación que elige el gerente. Módulo aparte porque un archivo
// "use server" solo puede exportar funciones, y esto lo usan la acción y la UI.
export const CANCEL_REASONS: Record<string, string> = {
  cliente_lo_pidio: "El cliente lo pidió",
  sin_produccion: "Sin capacidad de producción",
  error_en_pedido: "Error en el pedido",
  otro: "Otro motivo",
};
