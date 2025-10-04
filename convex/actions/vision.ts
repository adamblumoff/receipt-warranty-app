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
  clone: () => PreprocessedImage;
  rotate: (degrees: number) => PreprocessedImage;
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
  const detectBoundary = (): string | null => {
    if (contentType && contentType.includes('multipart/form-data')) {
      const match = /boundary="?([^\s;"]+)"?/i.exec(contentType);
      if (match) {
        return match[1];
      }
    }

    const searchLimit = Math.min(buffer.length, 2048);
    for (let i = 0; i < searchLimit - 2; i++) {
      if (buffer[i] === 0x2d && buffer[i + 1] === 0x2d) {
        let end = i + 2;
        while (end < buffer.length && buffer[end] !== 0x0d && buffer[end] !== 0x0a) {
          end += 1;
        }
        if (end > i + 2) {
          return buffer
            .subarray(i + 2, end)
            .toString('ascii')
            .trim();
        }
      }
    }
    return null;
  };

  const boundary = detectBoundary();
  if (!boundary) {
    return null;
  }

  const boundaryBuf = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  let cursor = 0;

  while (cursor < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuf, cursor);
    if (boundaryIndex === -1) {
      break;
    }
    let sectionStart = boundaryIndex + boundaryBuf.length;
    if (buffer[sectionStart] === 0x2d && buffer[sectionStart + 1] === 0x2d) {
      break;
    }
    if (buffer[sectionStart] === 0x0d && buffer[sectionStart + 1] === 0x0a) {
      sectionStart += 2;
    }

    const headerEnd = buffer.indexOf(headerSeparator, sectionStart);
    if (headerEnd === -1) {
      break;
    }

    const headers = buffer.subarray(sectionStart, headerEnd).toString('utf8');
    if (!/name="file"/i.test(headers)) {
      cursor = headerEnd + headerSeparator.length;
      continue;
    }

    const dataStart = headerEnd + headerSeparator.length;
    let nextBoundary = buffer.indexOf(boundaryBuf, dataStart);
    if (nextBoundary === -1) {
      nextBoundary = buffer.length;
    }
    let dataEnd = nextBoundary;
    if (buffer[dataEnd - 2] === 0x0d && buffer[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    }

    const file = buffer.subarray(dataStart, dataEnd);
    const detectedTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers);
    return { file, inferredType: detectedTypeMatch?.[1]?.trim() };
  }

  return null;
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

  const numericMatch = sanitized.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (numericMatch) {
    const [first, second, third] = numericMatch.slice(1).map((value) => Number.parseInt(value, 10));
    let year: number;
    let month: number;
    let day: number;
    if (first > 1900) {
      year = first;
      month = second;
      day = third;
    } else if (third > 1900) {
      year = third;
      month = first;
      day = second;
    } else {
      year = third >= 100 ? third : 2000 + third;
      month = first;
      day = second;
    }
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return undefined;
    }
    const normalized = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(normalized.getTime())) {
      return undefined;
    }
    return normalized.toISOString();
  }

  const parsed = new Date(sanitized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  ).toISOString();
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
    const matches = Array.from(line.matchAll(DATE_REGEX)) ?? [];
    if (matches.length === 0) {
      continue;
    }
    const isoValues = matches
      .map((match) => parseIsoDate(match[0]))
      .filter((value): value is string => Boolean(value));
    if (isoValues.length === 0) {
      continue;
    }
    const confidence = scoreForContext(line, [
      'expire',
      'valid',
      'thru',
      'through',
      'until',
      'redeem',
    ]);
    const candidateIso = /thru|through|until/i.test(line)
      ? isoValues.reduce((latest, current) => (current > latest ? current : latest), isoValues[0])
      : isoValues[0];

    if (
      !expiresCandidate ||
      confidence > expiresContext ||
      (confidence === expiresContext && candidateIso > (fields.expiresOn?.value ?? ''))
    ) {
      expiresCandidate = candidateIso;
      expiresContext = confidence;
      fields.expiresOn = buildField(candidateIso, confidence, line);
    }
  }

  let purchaseCandidate: string | undefined;
  let purchaseConfidence = 0.4;
  for (const line of lines) {
    const matches = Array.from(line.matchAll(DATE_REGEX)) ?? [];
    if (matches.length === 0) {
      continue;
    }
    const isoValues = matches
      .map((match) => parseIsoDate(match[0]))
      .filter((value): value is string => Boolean(value));
    if (isoValues.length === 0) {
      continue;
    }
    const confidence = scoreForContext(line, [
      'purchase',
      'purchased',
      'bought',
      'order',
      'date',
      'issued',
    ]);
    const candidateIso = /thru|through|until/i.test(line)
      ? isoValues[0]
      : isoValues.reduce(
          (earliest, current) => (current < earliest ? current : earliest),
          isoValues[0],
        );

    if (
      !purchaseCandidate ||
      confidence > purchaseConfidence ||
      (confidence === purchaseConfidence && candidateIso < (fields.purchaseDate?.value ?? ''))
    ) {
      purchaseCandidate = candidateIso;
      purchaseConfidence = confidence;
      fields.purchaseDate = buildField(candidateIso, confidence, line);
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
          attempts,
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
