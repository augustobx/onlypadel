/**
 * Utilidades para normalización y formateo consistente de números de teléfono.
 * Especialmente adaptado para formatos argentinos (+54 9, 011, 15, etc.).
 */

export function normalizePhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';

  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');

  if (!cleaned) return '';

  // Si tiene prefijo internacional con +, remover el + temporalmente para estandarizar
  let hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.slice(1);
  }

  // Si empieza con 549 (formato WhatsApp / internacional Argentina)
  if (cleaned.startsWith('549')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('54')) {
    cleaned = cleaned.slice(2);
  }

  // Si empieza con 0 (código de área interurbano, ej: 011 -> 11, 0223 -> 223)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Quitar el '15' si está después de un código de área común de 2 dígitos (ej: 11 15 xxxx -> 11 xxxx)
  // O de 3 dígitos (ej: 223 15 xxxx -> 223 xxxx)
  // O de 4 dígitos (ej: 2983 15 xxxx -> 2983 xxxx)
  if (cleaned.startsWith('11') && cleaned.length === 10 && cleaned.slice(2, 4) === '15') {
    // 11 15 xxxxxx -> 11 xxxxxx (8 dígitos locales)
    cleaned = '11' + cleaned.slice(4);
  } else if (cleaned.length === 12 && cleaned.slice(2, 4) === '15') {
    cleaned = cleaned.slice(0, 2) + cleaned.slice(4);
  } else if (cleaned.length === 12 && cleaned.slice(3, 5) === '15') {
    cleaned = cleaned.slice(0, 3) + cleaned.slice(5);
  } else if (cleaned.length === 12 && cleaned.slice(4, 6) === '15') {
    cleaned = cleaned.slice(0, 4) + cleaned.slice(6);
  }

  // Formato estándar: estándar nacional de 10 dígitos si es argentino (ej: 1112345678)
  return cleaned;
}

/**
 * Formatea un número normalizado para visualización legible.
 * Ej: "1123456789" -> "+54 9 11 2345-6789" o "11 2345-6789"
 */
export function formatPhoneDisplay(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const norm = normalizePhoneNumber(rawPhone);

  if (norm.length === 10) {
    // Si empieza con 11 (AMBA)
    if (norm.startsWith('11')) {
      return `11 ${norm.slice(2, 6)}-${norm.slice(6)}`;
    }
    // Si empieza con 3 dígitos (ej: 223, 341, 351)
    if (['221', '223', '341', '351', '261', '381'].includes(norm.slice(0, 3))) {
      return `${norm.slice(0, 3)} ${norm.slice(3, 6)}-${norm.slice(6)}`;
    }
    // Otros (4 dígitos de área)
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)}-${norm.slice(7)}`;
  }

  return rawPhone.trim();
}

/**
 * Comprueba si dos números de teléfono corresponden a la misma persona
 */
export function phonesMatch(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizePhoneNumber(phoneA);
  const normB = normalizePhoneNumber(phoneB);
  if (!normA || !normB) return false;
  return normA === normB || normA.endsWith(normB) || normB.endsWith(normA);
}
