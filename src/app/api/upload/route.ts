import { NextRequest, NextResponse } from 'next/server';
import { readUserSessionId } from '@/lib/user-session';
import { getAdminSession } from '@/lib/admin-auth';
import { objectStorage } from '@/lib/storage';
import { resolveTenantContext } from '@/lib/tenant-context';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario tenga sesión activa (socio o admin)
    const [userId, adminSession] = await Promise.all([
      readUserSessionId(),
      getAdminSession(),
    ]);

    if (!userId && !adminSession) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Debe iniciar sesión para subir archivos.' },
        { status: 401 }
      );
    }

    // Resolver tenant si aplica
    let tenantId: string | undefined;
    try {
      const tenant = await resolveTenantContext();
      tenantId = tenant?.id;
    } catch {
      // Si corre en standalone o local sin tenant
      tenantId = undefined;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderType = (formData.get('type') as string) || 'general';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se envió ningún archivo.' },
        { status: 400 }
      );
    }

    const mimeType = file.type.toLowerCase();
    const ext = ALLOWED_TYPES[mimeType];

    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF).',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'El archivo excede el tamaño máximo permitido de 5 MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFolder = folderType.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 15) || 'general';
    const originalBaseName = (file.name || 'image').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
    const fileName = `${originalBaseName}.${ext}`;

    const uploadResult = await objectStorage.upload({
      folder: safeFolder,
      fileName,
      mimeType,
      buffer,
      tenantId,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key: uploadResult.key,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al procesar y guardar la imagen.' },
      { status: 500 }
    );
  }
}
