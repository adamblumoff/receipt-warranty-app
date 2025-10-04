'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ImageAnnotatorClient } from '@google-cloud/vision';
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
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    projectId,
  });

  return cachedClient;
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
    const buffer = Buffer.from(arrayBuffer);

    const client = resolveVisionClient();

    const [textDetection] = await client.textDetection({
      image: { content: buffer },
    });
    const [documentDetection] = await client.documentTextDetection({
      image: { content: buffer },
    });

    const annotation = textDetection.fullTextAnnotation ?? documentDetection.fullTextAnnotation;
    const rawText = annotation?.text ?? textDetection.textAnnotations?.[0]?.description ?? '';
    if (!rawText.trim()) {
      return {
        storageId: args.storageId,
        analysisType: args.analyzeAs ?? 'unknown',
        rawText: '',
        lines: [],
        fields: {},
        warnings: ['No text detected in image'],
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
