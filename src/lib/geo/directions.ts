import "server-only";

export type LatLng = { lat: number; lng: number };

// Distancia REAL de ruta (no línea recta) entre dos puntos, vía la API de
// Directions de OpenRouteService — usada para validar `max_delivery_radius_km`
// y tarifar por `shipping_zones` (sección 07 del blueprint, Aceptación 2/3 de
// la Fase 4). Devuelve km o null si no se pudo calcular una ruta.
export async function getRouteDistanceKm(origin: LatLng, destination: LatLng): Promise<number | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY no está configurada.");

  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  const meters = data?.routes?.[0]?.summary?.distance;
  if (typeof meters !== "number") return null;

  return meters / 1000;
}
