'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getPosSales, PosSale } from '@/actions/pos';

export interface CashRegisterReport {
  dateStr: string;
  summary: {
    totalRevenue: number;          // Total general facturado
    totalCashIn: number;           // Total ingresado en efectivo (Canchas + Cantina)
    totalTransferIn: number;      // Total ingresado por transferencia/alias
    totalMercadoPagoIn: number;    // Total ingresado por Mercado Pago
    totalExpenses: number;         // Total egresos/gastos
    netCashInDrawer: number;       // Efectivo neto en caja (Efectivo - Gastos)
  };
  bookingsBreakdown: {
    totalBookingsCount: number;
    cashTotal: number;
    transferTotal: number;
    mercadoPagoTotal: number;
    pendingTotal: number;
    list: {
      id: string;
      courtName: string;
      timeStr: string;
      clientName: string;
      totalAmount: number;
      method: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'PENDING';
      status: string;
    }[];
  };
  cantinaBreakdown: {
    totalSalesCount: number;
    cashTotal: number;
    transferTotal: number;
    mercadoPagoTotal: number;
    list: PosSale[];
  };
  expensesBreakdown: {
    totalCount: number;
    totalAmount: number;
    list: {
      id: string;
      description: string;
      category: string | null;
      amount: number;
      timeStr: string;
    }[];
  };
}

export async function getCashRegisterReport(dateStr: string): Promise<{ success: boolean; data?: CashRegisterReport; error?: string }> {
  try {
    await requireAdmin();

    const startOfDay = new Date(`${dateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999-03:00`);

    // 1. Obtener reservas de la fecha
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' }
      },
      include: {
        court: true,
        user: true,
      },
      orderBy: { startTime: 'asc' }
    });

    // 2. Obtener ventas de cantina de la fecha
    const cantinaRes = await getPosSales(dateStr);
    const cantinaSales = cantinaRes.success ? cantinaRes.data : [];

    // 3. Obtener gastos de la fecha
    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { date: 'asc' }
    });

    // Procesar Turnos
    let bookingsCash = 0;
    let bookingsTransfer = 0;
    let bookingsMp = 0;
    let bookingsPending = 0;

    const bookingsList = bookings.map(b => {
      const amount = Number(b.totalAmount) || 0;
      let method: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'PENDING' = 'PENDING';

      if (b.paymentId || b.description?.includes('[MERCADOPAGO]')) {
        method = 'MERCADOPAGO';
        bookingsMp += amount;
      } else if (b.description?.includes('[CASH]')) {
        method = 'CASH';
        bookingsCash += amount;
      } else if (b.description?.includes('[TRANSFER]')) {
        method = 'TRANSFER';
        bookingsTransfer += amount;
      } else if (amount > 0) {
        method = 'CASH';
        bookingsCash += amount;
      } else {
        bookingsPending += amount;
      }

      const timeStr = b.startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return {
        id: b.id,
        courtName: b.court?.name || 'Cancha',
        timeStr: `${timeStr} hs`,
        clientName: b.user?.name || 'Jugador Local',
        totalAmount: amount,
        method,
        status: b.status,
      };
    });

    // Procesar Cantina
    let cantinaCash = 0;
    let cantinaTransfer = 0;
    let cantinaMp = 0;
    let cantinaCuentaCorriente = 0;

    cantinaSales.forEach(s => {
      const amt = Number(s.totalAmount) || 0;
      if (s.paymentMethod === 'CASH') cantinaCash += amt;
      else if (s.paymentMethod === 'TRANSFER') cantinaTransfer += amt;
      else if (s.paymentMethod === 'MERCADOPAGO') cantinaMp += amt;
      else if ((s.paymentMethod as any) === 'CUENTA_CORRIENTE') cantinaCuentaCorriente += amt;
    });

    // Procesar Gastos
    const totalExpenses = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const expensesList = expenses.map(e => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amount: Number(e.amount) || 0,
      timeStr: e.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }));

    // Consolidar Totales
    const totalCashIn = bookingsCash + cantinaCash;
    const totalTransferIn = bookingsTransfer + cantinaTransfer;
    const totalMercadoPagoIn = bookingsMp + cantinaMp;
    const totalRevenue = totalCashIn + totalTransferIn + totalMercadoPagoIn + cantinaCuentaCorriente;
    const netCashInDrawer = Math.max(0, totalCashIn - totalExpenses);

    return {
      success: true,
      data: {
        dateStr,
        summary: {
          totalRevenue,
          totalCashIn,
          totalTransferIn,
          totalMercadoPagoIn,
          totalExpenses,
          netCashInDrawer,
        },
        bookingsBreakdown: {
          totalBookingsCount: bookings.length,
          cashTotal: bookingsCash,
          transferTotal: bookingsTransfer,
          mercadoPagoTotal: bookingsMp,
          pendingTotal: bookingsPending,
          list: bookingsList,
        },
        cantinaBreakdown: {
          totalSalesCount: cantinaSales.length,
          cashTotal: cantinaCash,
          transferTotal: cantinaTransfer,
          mercadoPagoTotal: cantinaMp,
          cuentaCorrienteTotal: cantinaCuentaCorriente,
          list: cantinaSales,
        },
        expensesBreakdown: {
          totalCount: expenses.length,
          totalAmount: totalExpenses,
          list: expensesList,
        }
      }
    };
  } catch (err: any) {
    console.error('Error in getCashRegisterReport:', err);
    return { success: false, error: 'Error al generar el arqueo de caja.' };
  }
}
