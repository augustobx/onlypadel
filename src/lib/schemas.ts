import { z } from "zod";

// --- VALIDACIONES DE CANCHAS Y HORARIOS ---

export const courtSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  sport: z.string().min(1, "El deporte es obligatorio"),
  isActive: z.boolean().default(true),
});

export const businessHourSchema = z.object({
  courtId: z.string().min(1, "Cancha obligatoria"),
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido (HH:mm)"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido (HH:mm)"),
  slotDuration: z.number().int().min(30).max(180),
}).refine((data) => {
  const open = parseInt(data.openTime.replace(":", ""));
  const close = parseInt(data.closeTime.replace(":", ""));
  return close > open || close === 0;
}, {
  message: "La hora de cierre debe ser posterior a la apertura",
  path: ["closeTime"],
});

// --- VALIDACIONES DE RESERVAS ---

export const bookingSchema = z.object({
  courtId: z.string().min(1, "Cancha inválida"),
  userId: z.string().min(1, "Usuario inválido"),
  totalPrice: z.coerce.number().positive("Precio inválido"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).refine((data) => data.endTime > data.startTime, {
  message: "La hora de fin debe ser posterior a la de inicio",
  path: ["endTime"],
});

export const fixedBookingSchema = z.object({
  courtId: z.string().min(1, "Cancha obligatoria"),
  userId: z.string().min(1, "Usuario obligatorio"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: "La fecha de fin del abono debe ser posterior al inicio",
  path: ["endDate"],
});

export const courtBlockSchema = z.object({
  courtId: z.string().min(1, "Cancha obligatoria"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  reason: z.string().optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: "La hora de fin del bloqueo debe ser posterior a la de inicio",
  path: ["endTime"],
});

// --- VALIDACIONES DE TORNEOS ---

export const tournamentSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  entryFee: z.coerce.number().min(0, "La inscripción no puede ser negativa"),
  isPublished: z.boolean().default(false),
  requireDeposit: z.boolean().default(false),
  depositAmount: z.coerce.number().min(0).default(0),
  format: z.enum(["KNOCKOUT", "ROUND_ROBIN", "MIXED"]).default("KNOCKOUT"),
  maxTeams: z.coerce.number().nullable().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "La fecha de fin debe ser igual o posterior a la de inicio",
  path: ["endDate"],
});

// --- TIPOS INFERIDOS PARA USAR EN EL FRONTEND ---
export type CourtInput = z.infer<typeof courtSchema>;
export type BusinessHourInput = z.infer<typeof businessHourSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type FixedBookingInput = z.infer<typeof fixedBookingSchema>;
export type CourtBlockInput = z.infer<typeof courtBlockSchema>;
export type TournamentInput = z.infer<typeof tournamentSchema>;