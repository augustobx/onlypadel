'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';

export interface PosProduct {
  id: string;
  name: string;
  category: 'BEBIDAS' | 'EQUIPAMIENTO' | 'SNACKS' | 'OTROS';
  price: number;
  stock?: number;
  icon?: string;
}

export interface PosCartItem {
  product: PosProduct;
  quantity: number;
}

export interface PosSale {
  id: string;
  createdAt: string; // ISO string
  dateStr: string;   // YYYY-MM-DD
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'CUENTA_CORRIENTE';
  customerName?: string;
  userId?: string;
  notes?: string;
}

const DEFAULT_PRODUCTS: PosProduct[] = [
  { id: 'prod-1', name: 'Gatorade 500ml', category: 'BEBIDAS', price: 2200, icon: '🥤' },
  { id: 'prod-2', name: 'Agua Mineral 500ml', category: 'BEBIDAS', price: 1500, icon: '💧' },
  { id: 'prod-3', name: 'Cerveza Lata 473ml', category: 'BEBIDAS', price: 2800, icon: '🍺' },
  { id: 'prod-4', name: 'Tubo Pelotas Bullpadel Premium (x3)', category: 'EQUIPAMIENTO', price: 11500, icon: '🎾' },
  { id: 'prod-5', name: 'Overgrip Pro Wilson (Unidad)', category: 'EQUIPAMIENTO', price: 2500, icon: '🏸' },
  { id: 'prod-6', name: 'Alquiler de Paleta', category: 'EQUIPAMIENTO', price: 3500, icon: '🏓' },
  { id: 'prod-7', name: 'Barra de Cereal / Turrón', category: 'SNACKS', price: 800, icon: '🍫' },
  { id: 'prod-8', name: 'Café / Medialunas', category: 'SNACKS', price: 2000, icon: '☕' },
];

/**
 * Obtiene la lista de productos de la cantina
 */
export async function getPosProducts(): Promise<{ success: boolean; data: PosProduct[] }> {
  try {
    await requireAdmin();
    const setting = await prisma.setting.findFirst({
      where: { key: 'pos_products' }
    });

    if (!setting || !setting.value) {
      return { success: true, data: DEFAULT_PRODUCTS };
    }

    const parsed = JSON.parse(setting.value) as PosProduct[];
    return { success: true, data: Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRODUCTS };
  } catch (err: any) {
    console.error('Error fetching POS products:', err);
    return { success: false, data: DEFAULT_PRODUCTS };
  }
}

/**
 * Guarda o actualiza un producto en la cantina
 */
export async function savePosProduct(product: PosProduct): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const current = await getPosProducts();
    let products = current.data;

    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.push(product);
    }

    const existingSetting = await prisma.setting.findFirst({
      where: { key: 'pos_products' }
    });

    if (existingSetting) {
      await prisma.setting.update({
        where: { id: existingSetting.id },
        data: { value: JSON.stringify(products) }
      });
    } else {
      await prisma.setting.create({
        data: {
          key: 'pos_products',
          value: JSON.stringify(products)
        }
      });
    }

    revalidatePath('/admin/cantina');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving POS product:', err);
    return { success: false, error: 'No se pudo guardar el producto.' };
  }
}

/**
 * Elimina un producto de la cantina
 */
export async function deletePosProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const current = await getPosProducts();
    const filtered = current.data.filter(p => p.id !== productId);

    const existingSetting = await prisma.setting.findFirst({
      where: { key: 'pos_products' }
    });

    if (existingSetting) {
      await prisma.setting.update({
        where: { id: existingSetting.id },
        data: { value: JSON.stringify(filtered) }
      });
    }

    revalidatePath('/admin/cantina');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Error al eliminar producto.' };
  }
}

import { addAccountMovement } from '@/actions/current-account';

/**
 * Registra una venta de cantina
 */
export async function recordPosSale(params: {
  items: { productId: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'CUENTA_CORRIENTE';
  customerName?: string;
  userId?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: PosSale; error?: string }> {
  try {
    await requireAdmin();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Si es cuenta corriente, el socio debe estar seleccionado
    if (params.paymentMethod === 'CUENTA_CORRIENTE') {
      if (!params.userId) {
        return { success: false, error: 'Para fiar a Cuenta Corriente debe seleccionar un socio registrado.' };
      }

      const itemsDesc = params.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      const chargeRes = await addAccountMovement({
        userId: params.userId,
        type: 'CHARGE',
        amount: params.totalAmount,
        concept: `Cantina: ${itemsDesc}`,
        method: 'SYSTEM',
        notes: params.notes || 'Consumo en cantina'
      });

      if (!chargeRes.success) {
        return { success: false, error: chargeRes.error || 'No se pudo cargar a la cuenta corriente.' };
      }
    }

    const sale: PosSale = {
      id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now.toISOString(),
      dateStr,
      items: params.items,
      totalAmount: params.totalAmount,
      paymentMethod: params.paymentMethod,
      customerName: params.customerName?.trim() || 'Consumidor Final',
      userId: params.userId,
      notes: params.notes?.trim() || '',
    };

    const key = `pos_sales_${dateStr}`;
    const existing = await prisma.setting.findFirst({
      where: { key }
    });

    let currentSales: PosSale[] = [];
    if (existing && existing.value) {
      try {
        currentSales = JSON.parse(existing.value);
      } catch {}
    }

    currentSales.unshift(sale); // Primero las más recientes

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(currentSales) }
      });
    } else {
      await prisma.setting.create({
        data: {
          key,
          value: JSON.stringify(currentSales)
        }
      });
    }

    revalidatePath('/admin/cantina');
    revalidatePath('/admin/caja');
    revalidatePath('/admin/cuentas-corrientes');
    return { success: true, data: sale };
  } catch (err: any) {
    console.error('Error recording POS sale:', err);
    return { success: false, error: 'No se pudo registrar la venta.' };
  }
}

/**
 * Obtiene el historial de ventas de cantina de un día determinado
 */
export async function getPosSales(dateStr: string): Promise<{ success: boolean; data: PosSale[] }> {
  try {
    await requireAdmin();
    const key = `pos_sales_${dateStr}`;
    const setting = await prisma.setting.findFirst({
      where: { key }
    });

    if (!setting || !setting.value) {
      return { success: true, data: [] };
    }

    const sales = JSON.parse(setting.value) as PosSale[];
    return { success: true, data: Array.isArray(sales) ? sales : [] };
  } catch (err: any) {
    return { success: false, data: [] };
  }
}
