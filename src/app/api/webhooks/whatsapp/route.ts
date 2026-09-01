// src/app/api/webhooks/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/handler';
import { prisma } from '@/lib/prisma';
import { requireTenantFeature } from '@/lib/features';

// ============================================================================
// GET — Verificación del webhook por parte de Meta
// ============================================================================
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 }, select: { whatsappVerifyToken: true } });
    const verifyToken = settings?.whatsappVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook de WhatsApp verificado correctamente');
        return new Response(challenge, { status: 200 });
    }

    console.warn('⚠️ Verificación de webhook fallida — token incorrecto');
    return new Response('Error de validación', { status: 403 });
}

// ============================================================================
// POST — Recepción de mensajes entrantes
// ============================================================================
export async function POST(request: Request) {
    try {
        await requireTenantFeature('whatsapp');
        const body = await request.json();

        // Solo procesamos eventos de whatsapp_business_account
        if (body.object !== 'whatsapp_business_account') {
            return NextResponse.json({ status: 'ignored' });
        }

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        const phone = message?.from;

        const settings = await prisma.systemSetting.findFirst({ where: { id: 1 }, select: { autoWhatsapp: true, whatsappPhoneId: true } });
        const configuredPhoneId = settings?.whatsappPhoneId || process.env.WHATSAPP_PHONE_ID;
        if (configuredPhoneId && value?.metadata?.phone_number_id !== configuredPhoneId) {
            return NextResponse.json({ status: 'ignored_wrong_tenant' });
        }

        if (message && phone) {
            // Chequear si el bot está activado en el panel admin
            if (settings && settings.autoWhatsapp === false) {
                // El bot está apagado. Retornamos OK para que Meta no reintente, pero ignoramos el mensaje.
                return NextResponse.json({ status: 'ignored_bot_disabled' });
            }

            console.log(`📩 Mensaje de ${phone} | Tipo: ${message.type}`);

            // Procesamos en background para responder rápido a Meta (tienen timeout de 5s)
            await handleIncomingMessage(phone, message);
        }

        // Siempre respondemos 200 a Meta para que no reintente
        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('❌ Error procesando webhook de WhatsApp:', error);
        // Aún con error respondemos 200 para evitar que Meta reintente infinitamente
        return NextResponse.json({ status: 'error' }, { status: 200 });
    }
}
