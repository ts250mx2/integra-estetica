export const DOMAIN_SUFFIX = '.hl';

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Convierte el nombre del proyecto en su dominio de login:
 * quita espacios, acentos y caracteres especiales, pasa a minúsculas
 * y agrega el sufijo ".hl". Ej: "Barbería Bella Vita" → "barberiabellavita.hl".
 *
 * Compartido entre el formulario de registro (preview en vivo) y el
 * servidor (registro/login), para que ambos calculen el mismo dominio.
 */
export function toDominio(proyecto: string): string {
  const base = proyecto
    .trim()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  return base ? `${base}${DOMAIN_SUFFIX}` : '';
}
