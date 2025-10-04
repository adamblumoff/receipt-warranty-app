'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { JWT } from 'google-auth-library';
import { Jimp } from 'jimp';

type PreprocessedImage = {
  bitmap: {
    width: number;
    height: number;
  };
  scale: (factor: number) => PreprocessedImage;
  scaleToFit: (w: number, h: number, mode?: unknown) => PreprocessedImage;
  normalize: () => PreprocessedImage;
  contrast: (value: number) => PreprocessedImage;
  greyscale: () => PreprocessedImage;
  quality: (value: number) => PreprocessedImage;
  getBufferAsync: (mime: string) => Promise<Buffer>;
};
import type {
  BenefitType,
  VisionAnalysisResult,
  VisionFieldSuggestion,
} from '@receipt-warranty/shared';

const REQUIRED_ENV_VARS = [
  'GOOGLE_VISION_CLIENT_EMAIL',
  'GOOGLE_VISION_PRIVATE_KEY',
  'GOOGLE_VISION_PROJECT_ID',
] as const;

type RequiredEnv = (typeof REQUIRED_ENV_VARS)[number];

const ensureEnv = (key: RequiredEnv): string => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new ConvexError(`Missing environment variable: ${key}`);
  }
  if (key === 'GOOGLE_VISION_PRIVATE_KEY') {
    return value.replace(/\\n/g, '\n');
  }
  return value;
};

let cachedClient: ImageAnnotatorClient | null = null;

const resolveVisionClient = (): ImageAnnotatorClient => {
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
  try {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
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
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
      return processed;
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
    return buffer;
  } catch (error) {
    console.warn('Vision preprocessing skipped', error);
    return buffer;
  }
};

const extractMultipartFile = (
  buffer: Buffer,
  contentType?: string,
): { file: Buffer; inferredType?: string } | null => {
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return null;
  }
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
  if (!boundaryMatch) {
    return null;
  }
  const boundary = boundaryMatch[1];
  const sections = buffer.toString('latin1').split(`--${boundary}`);
  for (const section of sections) {
    if (!section.includes('Content-Disposition')) {
      continue;
    }
    const [rawHeaders, rawBody] = section.split('\r\n\r\n');
    if (!rawBody) {
      continue;
    }
    const headerText = rawHeaders.trim();
    const detectedTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerText);
    const bodyWithoutClosing = rawBody.replace(/\r\n--$/m, '').replace(/\r\n$/m, '');
    const file = Buffer.from(bodyWithoutClosing, 'latin1');
    return { file, inferredType: detectedTypeMatch?.[1]?.trim() };
  }
  return null;
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
  const [textDetection] = await client.textDetection({
    image: { content },
    imageContext: { languageHints: ['en'] },
  });
  const [documentDetection] = await client.documentTextDetection({
    image: { content },
    imageContext: { languageHints: ['en'] },
  });
  if (textDetection.error) {
    console.warn('Vision textDetection error', label, textDetection.error);
  }
  if (documentDetection.error) {
    console.warn('Vision documentDetection error', label, documentDetection.error);
  }
  const annotation = textDetection.fullTextAnnotation ?? documentDetection.fullTextAnnotation;
  const rawText = annotation?.text ?? textDetection.textAnnotations?.[0]?.description ?? '';

  return {
    rawText,
    textAnnotations: textDetection.textAnnotations?.length ?? 0,
    pages: annotation?.pages?.length ?? 0,
  };
};

const DATE_REGEX =
  /(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)|(\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b)|(\b[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}\b)/g;

const parseIsoDate = (candidate: string | undefined): string | undefined => {
  if (!candidate) {
    return undefined;
  }
  const sanitized = candidate.replace(/[,]/g, '').replace(/\s+/g, ' ').trim();
  const parsed = new Date(sanitized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
};

const scoreForContext = (line: string, keywords: string[]): number => {
  const lowered = line.toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword)) ? 0.85 : 0.55;
};

const buildField = <T>(
  value: T,
  confidence: number,
  sourceText: string,
): VisionFieldSuggestion<T> => ({
  value,
  confidence,
  sourceText,
});
const extractFields = (
  lines: string[],
  analysisType: VisionAnalysisResult['analysisType'],
): VisionAnalysisResult['fields'] => {
  const fields: VisionAnalysisResult['fields'] = {};

  if (lines.length > 0) {
    const merchantLine = lines[0];
    fields.merchant = buildField(merchantLine, 0.45, merchantLine);
  }

  if (lines.length > 1) {
    const descriptionLine = lines.slice(1, 4).find((line) => line.length > 3);
    if (descriptionLine) {
      fields.description = buildField(descriptionLine, 0.4, descriptionLine);
    }
  }

  let expiresCandidate: string | undefined;
  let expiresContext = 0.4;
  for (const line of lines) {
    const match = line.match(DATE_REGEX);
    if (!match) {
      continue;
    }
    const iso = parseIsoDate(match[0]);
    if (!iso) {
      continue;
    }
    const confidence = scoreForContext(line, ['expire', 'valid', 'thru', 'until', 'redeem']);
    if (!expiresCandidate || confidence > expiresContext) {
      expiresCandidate = iso;
      expiresContext = confidence;
      fields.expiresOn = buildField(iso, confidence, line);
    }
  }

  let purchaseCandidate: string | undefined;
  let purchaseConfidence = 0.4;
  for (const line of lines) {
    const match = line.match(DATE_REGEX);
    if (!match) {
      continue;
    }
    const iso = parseIsoDate(match[0]);
    if (!iso) {
      continue;
    }
    const confidence = scoreForContext(line, ['purchase', 'bought', 'order', 'date', 'issued']);
    if (!purchaseCandidate || confidence > purchaseConfidence) {
      purchaseCandidate = iso;
      purchaseConfidence = confidence;
      fields.purchaseDate = buildField(iso, confidence, line);
    }
  }

  const amountRegex = /(total|amount|balance|due)\D{0,8}(\d{1,3}(?:[.,]\d{3})*\.?\d{2})/i;
  for (const line of [...lines].reverse()) {
    const amountMatch = line.match(amountRegex);
    if (amountMatch) {
      const numeric = Number(amountMatch[2].replace(/[,]/g, ''));
      if (!Number.isNaN(numeric)) {
        fields.totalAmount = buildField(numeric, 0.8, line);
        break;
      }
    }
  }

  if (analysisType === 'warranty') {
    const warrantyLine = lines.find((line) => /warrant/i.test(line));
    if (warrantyLine) {
      fields.productName = buildField(warrantyLine, 0.5, warrantyLine);
    }
    if (fields.expiresOn && !fields.coverageEndsOn) {
      fields.coverageEndsOn = fields.expiresOn;
    }
  }

  return fields;
};

const buildWarnings = (fields: VisionAnalysisResult['fields']): string[] => {
  const warnings: string[] = [];
  if (!fields.merchant) {
    warnings.push('Merchant not detected');
  }
  if (!fields.description) {
    warnings.push('Description not detected');
  }
  if (!fields.expiresOn && !fields.coverageEndsOn) {
    warnings.push('Expiration or coverage date not detected');
  }
  return warnings;
};

export const analyzeBenefitImage = action({
  args: {
    storageId: v.id('_storage'),
    analyzeAs: v.optional(v.union(v.literal('coupon'), v.literal('warranty'))),
  },
  handler: async (ctx, args): Promise<VisionAnalysisResult> => {
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError('Uploaded file not found');
    }

    const arrayBuffer = await blob.arrayBuffer();
    let originalBuffer = Buffer.from(arrayBuffer);
    let detectedContentType = blob.type;

    const multipart = extractMultipartFile(originalBuffer, blob.type);
    if (multipart) {
      originalBuffer = multipart.file;
      detectedContentType = multipart.inferredType ?? detectedContentType;
    }

    const processedBuffer = await preprocessImage(originalBuffer);

    const client = resolveVisionClient();

    let { rawText, textAnnotations, pages } = await runDetection(
      client,
      processedBuffer,
      'processed',
    );
    if (!rawText.trim()) {
      const fallback = await runDetection(client, originalBuffer, 'original');
      rawText = fallback.rawText;
      textAnnotations = fallback.textAnnotations;
      pages = fallback.pages;
    }

    if (!rawText.trim()) {
      return {
        storageId: args.storageId,
        analysisType: args.analyzeAs ?? 'unknown',
        rawText: '',
        lines: [],
        fields: {},
        warnings: ['No text detected in image'],
        debug: {
          contentType: detectedContentType,
          originalSize: originalBuffer.length,
          processedSize: processedBuffer.length,
          textAnnotations,
          documentPages: pages,
          multipartDecoded: Boolean(multipart),
        },
      };
    }

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const analysisType: BenefitType | 'unknown' = args.analyzeAs ?? 'unknown';
    const fields = extractFields(lines, analysisType);
    const warnings = buildWarnings(fields);

    if (!fields.merchant && lines.length > 0) {
      fields.merchant = buildField(lines[0], 0.35, lines[0]);
    }

    if (analysisType === 'coupon' && fields.expiresOn) {
      fields.coverageEndsOn = undefined;
    }

    return {
      storageId: args.storageId,
      analysisType,
      rawText,
      lines,
      fields,
      warnings,
    };
  },
});
