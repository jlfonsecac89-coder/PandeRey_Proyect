// Aproximación en JS de lower(unaccent(name)) — usada solo para dar un aviso
// amigable ANTES de golpear la base ("ya existe algo parecido"). La fuente de
// verdad real es la restricción unique sobre name_normalized en Postgres
// (sección 13 del blueprint); si esta función difiere levemente del
// diccionario de unaccent de Postgres en algún caso raro, el constraint de
// la base sigue siendo quien decide.
const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(name: string): string {
  return normalizeName(name)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
