import "server-only";

export type GeocodeResult = { lat: number; lng: number };

// Geocodificación vía OpenRouteService (Pelias sobre OpenStreetMap) — reemplaza
// a Google Maps Geocoding API por tener tier gratuito sin tarjeta (sección 06/07
// del blueprint). Interfaz aislada a propósito: migrar de proveedor más adelante
// solo implica reescribir este archivo, nada del resto del código cambia.
export async function geocodeAddress(addressText: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY no está configurada.");

  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", addressText);
  url.searchParams.set("boundary.country", "CL");
  url.searchParams.set("size", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data?.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;

  const [lng, lat] = coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return { lat, lng };
}
