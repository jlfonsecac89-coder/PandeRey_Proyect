/**
 * Normalizes a string by converting it to lowercase, trimming whitespace, and removing diacritics.
 */
export function normalizeString(str: string | undefined | null): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Generates a URL-friendly slug from a string.
 */
export function generateSlug(str: string | undefined | null): string {
    return normalizeString(str).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
