// src/lib/share-booking.ts
// Utilidad para compartir la convocatoria de partido con los 4 jugadores

export interface ShareBookingData {
  courtName: string;
  dateStr: string;
  timeStr: string;
  bookingCode?: string;
  clubName?: string;
  sportEmoji?: string;
  playerName?: string;
}

export function generateShareText(data: ShareBookingData): string {
  const emoji = data.sportEmoji || '🎾';
  const club = data.clubName || 'OnlyPadel';
  const code = data.bookingCode ? `\n🎟️ *Reserva:* ${data.bookingCode}` : '';
  const player = data.playerName || 'Jugador 1';

  return [
    `${emoji} *¡Tenemos turno de Pádel en ${club}!*`,
    `📍 *Cancha:* ${data.courtName}`,
    `📅 *Fecha:* ${data.dateStr}`,
    `🕐 *Horario:* ${data.timeStr} hs${code}`,
    '',
    '👥 *¿Quiénes jugamos?*',
    `1. ${player} ✅`,
    '2. [Compañero/a] 🎾',
    '3. [Rival 1] 🎾',
    '4. [Rival 2] 🎾',
    '',
    '¡Confirmá si venís así cerramos la cancha!'
  ].join('\n');
}

export async function shareBooking(data: ShareBookingData): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  const text = generateShareText(data);
  const title = `Turno de Pádel - ${data.courtName} (${data.timeStr} hs)`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback: Portapapeles
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    } catch {
      return { success: false, method: 'failed' };
    }
  }

  return { success: false, method: 'failed' };
}
