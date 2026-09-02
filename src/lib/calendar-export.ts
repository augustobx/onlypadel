// src/lib/calendar-export.ts
// Utilidades para exportar turnos a Google Calendar y Apple/Outlook Calendar (.ics)

interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

/** Formatea una fecha a formato UTC básico para calendarios: YYYYMMDDTHHMMSSZ */
function formatCalendarDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Genera el enlace web directo a Google Calendar con el evento pre-cargado
 */
export function getGoogleCalendarUrl(event: CalendarEventData): string {
  const startStr = formatCalendarDate(event.startDate);
  const endStr = formatCalendarDate(event.endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera y descarga un archivo estándar .ics (iCalendar) para Apple Calendar, Outlook y dispositivos móviles
 */
export function downloadIcsFile(event: CalendarEventData, filename = 'turno-padel.ics'): void {
  if (typeof window === 'undefined') return;

  const startStr = formatCalendarDate(event.startDate);
  const endStr = formatCalendarDate(event.endDate);
  const nowStr = formatCalendarDate(new Date());
  const uid = `booking-${Date.now()}@onlypadel.app`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OnlyPadel//Booking System//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de partido de Pádel',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
