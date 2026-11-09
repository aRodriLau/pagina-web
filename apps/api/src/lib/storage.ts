import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Config } from '../config';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export interface Storage {
  createUploadUrl(userId: string, contentType: string, sizeBytes: number): Promise<{ key: string; uploadUrl: string }>;
  publicUrl(key: string): string;
}

/**
 * Upload diretto dal telefono allo storage (S3 / Cloudflare R2) tramite URL firmato:
 * le immagini non passano mai dal nostro server, che resta leggero ed economico.
 */
export function createS3Storage(config: Config): Storage {
  const client = new S3Client({
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: Boolean(config.S3_ENDPOINT),
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
  });

  return {
    async createUploadUrl(userId, contentType, sizeBytes) {
      const key = `posts/${userId}/${randomUUID()}.${EXT[contentType] ?? 'bin'}`;
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: key,
          ContentType: contentType,
          ContentLength: sizeBytes,
        }),
        { expiresIn: 600 },
      );
      return { key, uploadUrl };
    },
    publicUrl: (key) => `${config.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
  };
}
