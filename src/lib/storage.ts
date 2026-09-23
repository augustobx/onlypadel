import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

export interface UploadOptions {
  folder: string; // e.g., 'avatars', 'posts', 'matches', 'general'
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  tenantId?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(options: UploadOptions): Promise<UploadResult>;
  delete(key: string): Promise<boolean>;
}

class CloudflareR2Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET || 'onlypadel-media';
    this.publicUrl = (process.env.R2_PUBLIC_URL || '/api/media').replace(/\/$/, '');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      console.warn('[R2 Storage] Incomplete R2 credentials in environment variables.');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint || '',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const tenantPrefix = options.tenantId ? `tenants/${options.tenantId}/` : 'global/';
    const folderClean = options.folder.replace(/^\/+|\/+$/g, '');
    const cleanFileName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${tenantPrefix}${folderClean}/${Date.now()}_${cleanFileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: options.buffer,
        ContentType: options.mimeType,
      })
    );

    const url = `${this.publicUrl}/${key}`;

    return {
      url,
      key,
      size: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err) {
      console.error('[R2 Storage] Failed to delete file:', err);
      return false;
    }
  }
}

class LocalStorageProvider implements StorageProvider {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const tenantFolder = options.tenantId ? `tenant_${options.tenantId}` : 'global';
    const targetDir = path.join(this.uploadsDir, tenantFolder, options.folder);
    await mkdir(targetDir, { recursive: true });

    const cleanFileName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${cleanFileName}`;
    const filePath = path.join(targetDir, filename);

    await writeFile(filePath, options.buffer);

    const key = `${tenantFolder}/${options.folder}/${filename}`;
    const url = `/uploads/${key}`;

    return {
      url,
      key,
      size: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadsDir, key);
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

function createStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  const hasR2Creds = Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

  if (provider === 'r2' || (provider !== 'local' && hasR2Creds)) {
    return new CloudflareR2Provider();
  }

  return new LocalStorageProvider();
}

export const objectStorage = createStorageProvider();
