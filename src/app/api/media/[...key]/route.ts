import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyParts } = await context.params;
    if (!keyParts || keyParts.length === 0) {
      return new NextResponse('Key missing', { status: 400 });
    }

    const key = keyParts.join('/');
    const bucket = process.env.R2_BUCKET || 'onlypadel-media';

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return new NextResponse('Object not found', { status: 404 });
    }

    const contentType = response.ContentType || 'image/jpeg';
    const bytes = await response.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('Error serving media from R2:', error);
    return new NextResponse('Media error', { status: 500 });
  }
}
