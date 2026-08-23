// Tiempo reservado para completar Mercado Pago. Los reintentos con la misma
// clave siguen apuntando al mismo booking durante toda esta ventana.
export const PENDING_BOOKING_TTL_MS = 15 * 60 * 1000;
