/**
 * Obtiene la URL completa del backend de la API para desarrollo y producción.
 */
export const getApiUrl = (path: string): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // En desarrollo local, conectar al puerto 3001
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:3001${path}`;
    }
  }

  // En producción, obtener la URL del backend desde las variables de entorno
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
    return `${base}${path}`;
  }

  return path;
};
