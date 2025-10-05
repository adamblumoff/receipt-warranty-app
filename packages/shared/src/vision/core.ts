import { ImageAnnotatorClient } from '@google-cloud/vision';
import { JWT } from 'google-auth-library';
import { Jimp } from 'jimp';

import type { BenefitType, VisionAnalysisResult } from '../types.js';
import { deriveFieldsFromLines, buildWarnings } from '../ocrParser.js';

type PreprocessedImage = {
  bitmap: {
    width: number;
    height: number;
  };
  clone: () => PreprocessedImage;
  rotate: (degrees: number) => PreprocessedImage;
  scale: (factor: number) => PreprocessedImage;
  normalize: () => PreprocessedImage;
  contrast: (value: number) => PreprocessedImage;
  greyscale: () => PreprocessedImage;
  quality: (value: number) => PreprocessedImage;
  getBufferAsync: (mime: string) => Promise<Buffer>;
};

const REQUIRED_ENV_VARS = [
  'GOOGLE_VISION_CLIENT_EMAIL',
  'GOOGLE_VISION_PRIVATE_KEY',
  'GOOGLE_VISION_PROJECT_ID',
] as const;

type RequiredEnv = (typeof REQUIRED_ENV_VARS)[number];

const ensureEnv = (key: RequiredEnv): string => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  if (key === 'GOOGLE_VISION_PRIVATE_KEY') {
    return value.replace(/\\n/g, '\n');
  }
  return value;
};

let cachedClient: ImageAnnotatorClient | null = null;

export const resolveVisionClient = (): ImageAnnotatorClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const clientEmail = ensureEnv('GOOGLE_VISION_CLIENT_EMAIL');
  const privateKey = ensureEnv('GOOGLE_VISION_PRIVATE_KEY');
  const projectId = ensureEnv('GOOGLE_VISION_PROJECT_ID');

  cachedClient = new ImageAnnotatorClient({
    projectId,
    authClient: new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    }),
  });

  return cachedClient;
};

const preprocessImage = async (buffer: Buffer): Promise<Buffer> => {
  if (buffer.length <= 80_000) {
    return buffer;
  }
  try {
    const jimpImage = (await Jimp.read(buffer)) as unknown as PreprocessedImage;
    if (jimpImage.bitmap && (jimpImage.bitmap.width < 960 || jimpImage.bitmap.height < 960)) {
      const targetWidth = Math.max(jimpImage.bitmap.width, 960);
      const targetHeight = Math.max(jimpImage.bitmap.height, 960);
      const scaleFactor = Math.min(
        targetWidth / jimpImage.bitmap.width,
        targetHeight / jimpImage.bitmap.height,
      );
      if (scaleFactor > 1 && typeof jimpImage.scale === 'function') {
        jimpImage.scale(scaleFactor);
      }
    }
    if (typeof jimpImage.normalize === 'function') {
      jimpImage.normalize();
    }
    if (typeof jimpImage.contrast === 'function') {
      jimpImage.contrast(0.15);
    }
    if (typeof jimpImage.greyscale === 'function') {
      jimpImage.greyscale();
    }
    const mime = (Jimp as unknown as { MIME_JPEG?: string }).MIME_JPEG ?? 'image/jpeg';
    if (typeof jimpImage.getBufferAsync === 'function') {
      const processed = await jimpImage.getBufferAsync(mime);
      return processed;
    }
    return buffer;
  } catch (error) {
    console.warn('Vision preprocessing skipped', error);
    return buffer;
  }
};

const rotateBuffers = async (buffer: Buffer): Promise<Buffer[]> => {
  const buffers: Buffer[] = [];
  try {
    const baseImage = (await Jimp.read(buffer)) as unknown as PreprocessedImage;
    const mime = (Jimp as unknown as { MIME_JPEG?: string }).MIME_JPEG ?? 'image/jpeg';
    for (const degrees of [90, 180, 270]) {
      try {
        const rotated = baseImage.clone().rotate(degrees);
        if (typeof rotated.getBufferAsync === 'function') {
          const candidate = await rotated.getBufferAsync(mime);
          buffers.push(candidate);
        }
      } catch (rotationError) {
        console.warn('Vision rotation fallback skipped', rotationError);
      }
    }
  } catch (error) {
    console.warn('Vision rotation setup failed', error);
  }
  return buffers;
};

const runDetection = async (
  client: ImageAnnotatorClient,
  content: Buffer,
  label: string,
): Promise<{
  rawText: string;
  textAnnotations: number;
  pages: number;
}> => {
  const textStart = Date.now();
  const [textDetection] = await client.annotateImage({
    image: { content },
    features: [{ type: 'TEXT_DETECTION' }],
    imageContext: { languageHints: ['en'] },
  });
  console.log('vision:text_ms', { label, duration: Date.now() - textStart });

  let annotation = textDetection.fullTextAnnotation;
  let textAnnotations = textDetection.textAnnotations ?? [];

  if ((!annotation || !annotation.text?.trim()) && textAnnotations.length === 0) {
    const documentStart = Date.now();
    const [documentDetection] = await client.annotateImage({
      image: { content },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      imageContext: { languageHints: ['en'] },
    });
    console.log('vision:document_ms', { label, duration: Date.now() - documentStart });
    annotation = documentDetection.fullTextAnnotation ?? annotation;
    textAnnotations = documentDetection.textAnnotations ?? textAnnotations;
  }

  const rawText = annotation?.text ?? textAnnotations?.[0]?.description ?? '';

  return {
    rawText,
    textAnnotations: textAnnotations?.length ?? 0,
    pages: annotation?.pages?.length ?? 0,
  };
};

export const analyzeImageBuffer = async (
  originalBuffer: Buffer,
  analysisType: BenefitType | 'unknown',
): Promise<VisionAnalysisResult> => {
  const processedBuffer = await preprocessImage(originalBuffer);
  const client = resolveVisionClient();

  let attemptLabel = 'processed';
  const attempts = [{ label: 'processed', size: processedBuffer.length }];
  let { rawText, textAnnotations, pages } = await runDetection(
    client,
    processedBuffer,
    attemptLabel,
  );
  if (!rawText.trim()) {
    attemptLabel = 'original';
    attempts.push({ label: attemptLabel, size: originalBuffer.length });
    const fallback = await runDetection(client, originalBuffer, attemptLabel);
    rawText = fallback.rawText;
    textAnnotations = fallback.textAnnotations;
    pages = fallback.pages;
  }

  if (!rawText.trim()) {
    const rotatedBuffers = await rotateBuffers(originalBuffer);
    for (const [index, altBuffer] of rotatedBuffers.entries()) {
      attemptLabel = `rotated_${(index + 1) * 90}`;
      attempts.push({ label: attemptLabel, size: altBuffer.length });
      const rotatedResult = await runDetection(client, altBuffer, attemptLabel);
      rawText = rotatedResult.rawText;
      textAnnotations = rotatedResult.textAnnotations;
      pages = rotatedResult.pages;
      if (rawText.trim()) {
        break;
      }
    }
  }

  if (!rawText.trim()) {
    return {
      storageId: '',
      analysisType,
      rawText: '',
      lines: [],
      fields: {},
      warnings: ['No text detected in image'],
      debug: {
        processedSize: processedBuffer.length,
        textAnnotations,
        documentPages: pages,
        attempts,
      },
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fields = deriveFieldsFromLines(lines, analysisType);
  const warnings = buildWarnings(fields);

  if (analysisType === 'coupon' && fields.expiresOn) {
    fields.coverageEndsOn = undefined;
  }

  return {
    storageId: '',
    analysisType,
    rawText,
    lines,
    fields,
    warnings,
  };
};
