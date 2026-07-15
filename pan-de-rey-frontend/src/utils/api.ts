/**
 * Obtiene la URL completa del backend de la API para desarrollo y producción.
 */
export const getApiUrl = (path: string): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // En desarrollo local, conectar al puerto 3001 del backend Express local
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:3001${path}`;
    }
  }

  // En producción (Vercel), las rutas de API están unificadas en el mismo servidor.
  // Se deben usar rutas relativas para evitar problemas de CORS, HTTPS mixto y DNS fallidos.
  return path;
};
