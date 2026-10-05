export const VALID_CATEGORIES = ['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'] as const;
export type PadelCategory = typeof VALID_CATEGORIES[number];

export const CATEGORY_RANKS: Record<string, number> = {
  '8va': 8,
  '7ma': 7,
  '6ta': 6,
  '5ta': 5,
  '4ta': 4,
  '3ra': 3,
  '2da': 2,
  '1ra': 1,
};

export const CATEGORY_LABELS: Record<string, string> = {
  '8va': '8va (Iniciación / Principiante)',
  '7ma': '7ma (Intermedio Inicial)',
  '6ta': '6ta (Intermedio)',
  '5ta': '5ta (Intermedio Alto)',
  '4ta': '4ta (Avanzado)',
  '3ra': '3ra (Competitivo)',
  '2da': '2da (Semi-Profesional)',
  '1ra': '1ra (Profesional / Elite)',
};

export interface CategoryValidationResult {
  valid: boolean;
  error?: string;
}

export function normalizeCategory(cat?: string | null): string {
  if (!cat) return '';
  const clean = cat.trim().toLowerCase();
  for (const c of VALID_CATEGORIES) {
    if (clean === c.toLowerCase() || clean === `${c.toLowerCase()} categoría` || clean.startsWith(c.toLowerCase())) {
      return c;
    }
  }
  return cat.trim();
}

/**
 * Valida la habilitación de un jugador o pareja según la modalidad del torneo
 */
export function validatePairCategory(
  categoryType: 'CATEGORIA_UNICA' | 'SUMA' | string,
  baseCategoryOrTarget: string | null | undefined,
  targetSum: number | null | undefined,
  p1CategoryRaw: string | null | undefined,
  p2CategoryRaw: string | null | undefined
): CategoryValidationResult {
  const p1 = normalizeCategory(p1CategoryRaw);
  const p2 = normalizeCategory(p2CategoryRaw);

  if (!p1) {
    return { valid: false, error: 'El Jugador 1 no tiene categoría asignada.' };
  }
  if (!p2) {
    return { valid: false, error: 'El Jugador 2 no tiene categoría asignada.' };
  }

  const p1Rank = CATEGORY_RANKS[p1];
  const p2Rank = CATEGORY_RANKS[p2];

  if (!p1Rank) {
    return { valid: false, error: `Categoría inválida para el Jugador 1 (${p1}).` };
  }
  if (!p2Rank) {
    return { valid: false, error: `Categoría inválida para el Jugador 2 (${p2}).` };
  }

  // --- MODALIDAD 1: CATEGORÍA ÚNICA ---
  if (categoryType === 'CATEGORIA_UNICA' || !categoryType) {
    const target = normalizeCategory(baseCategoryOrTarget);
    const targetRank = CATEGORY_RANKS[target];

    if (!targetRank) {
      return { valid: false, error: `Categoría del torneo no reconocida (${baseCategoryOrTarget}).` };
    }

    // Regla de Jugador individual contra categoría del torneo:
    const checkPlayer = (playerRank: number, playerCat: string, playerName: string): CategoryValidationResult => {
      // 1. Nadie puede jugar en una categoría más baja a la suya
      // Menor número = categoría más alta (ej: 6ta=6 vs 7ma=7)
      if (playerRank < targetRank) {
        return {
          valid: false,
          error: `${playerName} es de ${playerCat} y no puede anotarse a una categoría inferior (${target}).`
        };
      }

      // 2. 8va solo juega 8va
      if (playerCat === '8va' && target !== '8va') {
        return {
          valid: false,
          error: `${playerName} es de 8va categoría y únicamente puede participar en torneos de 8va.`
        };
      }

      // 3. Se permite jugar en la propia o hasta 1 categoría superior
      if (playerRank - targetRank > 1) {
        return {
          valid: false,
          error: `${playerName} es de ${playerCat} y solo puede subir hasta 1 categoría superior.`
        };
      }

      return { valid: true };
    };

    const p1Check = checkPlayer(p1Rank, p1, 'El Jugador 1');
    if (!p1Check.valid) return p1Check;

    const p2Check = checkPlayer(p2Rank, p2, 'El Jugador 2');
    if (!p2Check.valid) return p2Check;

    return { valid: true };
  }

  // --- MODALIDAD 2: TORNEO POR SUMA ---
  if (categoryType === 'SUMA') {
    const minSum = targetSum || 15;
    const pairSum = p1Rank + p2Rank;

    // En torneos por suma (ej. Suma 15):
    // 8va(8) + 7ma(7) = 15 -> OK
    // 8va(8) + 8va(8) = 16 -> OK (suma más alta, nivel más bajo o permitido)
    // 6ta(6) + 7ma(7) = 13 -> NO! Suma 13 supera el nivel de Suma 15 (es ventajera)
    if (pairSum < minSum) {
      return {
        valid: false,
        error: `La pareja suma ${pairSum} (${p1} + ${p2}), pero este torneo es Suma ${minSum}. El nivel de la pareja es demasiado alto para esta categoría.`
      };
    }

    return { valid: true };
  }

  return { valid: true };
}
