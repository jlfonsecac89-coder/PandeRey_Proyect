import "server-only";

export type GeocodeResult = { lat: number; lng: number };

const RM_BOUNDARY = {
  minLon: "-71.5",
  minLat: "-34.35",
  maxLon: "-69.8",
  maxLat: "-32.85",
};

// "address"/"street" = Pelias encontró el número o al menos la calle real;
// cualquier otra capa ("locality", "localadmin", "region"...) es un
// fallback a un punto mucho más ancho (el centro de toda la comuna/región) —
// sirve para saber cuándo vale la pena reintentar con otro texto.
const PRECISE_LAYERS = new Set(["address", "street"]);

type RawFeature = { lat: number; lng: number; layer: string | undefined };

async function searchOnce(addressText: string): Promise<RawFeature | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY no está configurada.");

  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", addressText);
  url.searchParams.set("boundary.country", "CL");
  // El despacho solo cubre la Región Metropolitana (RM_COMUNAS), pero Chile
  // tiene comunas con el mismo nombre en regiones distintas (ej. "Recoleta"
  // existe en RM y también en Coquimbo) — sin este bounding box, Pelias
  // puede devolver como primer resultado una comuna homónima a cientos de
  // km, y esa coordenada se usaba tal cual para calcular la distancia de
  // envío (bug real: devolvía ~430 km para una dirección a 6 km).
  url.searchParams.set("boundary.rect.min_lon", RM_BOUNDARY.minLon);
  url.searchParams.set("boundary.rect.min_lat", RM_BOUNDARY.minLat);
  url.searchParams.set("boundary.rect.max_lon", RM_BOUNDARY.maxLon);
  url.searchParams.set("boundary.rect.max_lat", RM_BOUNDARY.maxLat);
  url.searchParams.set("size", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data?.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;

  const [lng, lat] = coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return { lat, lng, layer: feature?.properties?.layer };
}

// Usado por la creación de sucursal en Admin (un solo campo de texto libre,
// dirección verificada a mano por un humano) — sin reintento estructurado.
export async function geocodeAddress(addressText: string): Promise<GeocodeResult | null> {
  const result = await searchOnce(addressText);
  return result ? { lat: result.lat, lng: result.lng } : null;
}

// Usado por direcciones de clientes en el checkout: "calle número, COMUNA,
// Chile" suele fallar a nivel de comuna cuando la calle tiene el mismo
// nombre que la comuna (ej. "Avenida Recoleta 1259, Recoleta, Chile" —
// Pelias no distingue cuál de los dos "Recoleta" es la calle, y devuelve el
// centro de la comuna entera, a veces >1 km del número real). Reemplazar la
// comuna por "Santiago" en el texto de búsqueda resuelve esa ambigüedad casi
// siempre (confirmado empíricamente: pasa de layer "locality"/fallback a
// "address"/exact) porque así OSM matchea contra la calle sin competir con
// el nombre de la comuna — el despacho de todas formas solo cubre la Región
// Metropolitana, así que "Santiago" como ciudad es válido para cualquier
// comuna de RM_COMUNAS.
export async function geocodeStreetAddress(params: {
  calle: string;
  numero: string;
  comuna: string;
}): Promise<GeocodeResult | null> {
  const { calle, numero, comuna } = params;

  const withComuna = await searchOnce(`${calle} ${numero}, ${comuna}, Chile`);
  if (withComuna && PRECISE_LAYERS.has(withComuna.layer ?? "")) {
    return { lat: withComuna.lat, lng: withComuna.lng };
  }

  const withCity = await searchOnce(`${calle} ${numero}, Santiago, Chile`);
  if (withCity && PRECISE_LAYERS.has(withCity.layer ?? "")) {
    return { lat: withCity.lat, lng: withCity.lng };
  }

  // Ninguno de los dos dio un match preciso — mejor un resultado aproximado
  // (todavía centrado en la comuna correcta gracias al bounding box) que
  // rechazar la dirección directamente.
  const best = withCity ?? withComuna;
  return best ? { lat: best.lat, lng: best.lng } : null;
}
