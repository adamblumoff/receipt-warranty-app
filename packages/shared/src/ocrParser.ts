import type { VisionAnalysisResult, VisionFieldSuggestion, BenefitType } from './types';

const DATE_REGEX =
  /(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)|(\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b)|(\b[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s*\d{4}\b)|(\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]{3,9}[,]?\s*\d{4}\b)/g;

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const normalizeNumeric = (year: number, month: number, day: number): string | undefined => {
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return undefined;
  }
  const normalized = new Date(Date.UTC(year, month, day, 12, 0, 0));
  if (Number.isNaN(normalized.getTime())) {
    return undefined;
  }
  return normalized.toISOString();
};

const parseIsoDate = (candidate: string | undefined): string | undefined => {
  if (!candidate) {
    return undefined;
  }
  const sanitized = candidate
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .trim();

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
    return normalizeNumeric(year, month - 1, day);
  }

  const monthFirst = sanitized.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s*(\d{4})$/i);
  if (monthFirst) {
    const [, monthText, dayText, yearText] = monthFirst;
    const monthIndex = MONTH_MAP[monthText.toLowerCase()];
    if (monthIndex !== undefined) {
      return normalizeNumeric(Number(yearText), monthIndex, Number(dayText));
    }
  }

  const dayFirst = sanitized.match(/^(\d{1,2})\s+(?:of\s+)?([A-Za-z]{3,9})\s*(\d{4})$/i);
  if (dayFirst) {
    const [, dayText, monthText, yearText] = dayFirst;
    const monthIndex = MONTH_MAP[monthText.toLowerCase()];
    if (monthIndex !== undefined) {
      return normalizeNumeric(Number(yearText), monthIndex, Number(dayText));
    }
  }

  const parsed = new Date(sanitized);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0),
    ).toISOString();
  }
  return undefined;
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

export const deriveFieldsFromLines = (
  lines: string[],
  analysisType: BenefitType | 'unknown',
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

export const buildWarnings = (fields: VisionAnalysisResult['fields']): string[] => {
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

export const deriveAnalysisFromText = (
  text: string,
  analysisType: BenefitType | 'unknown',
): VisionAnalysisResult => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fields = deriveFieldsFromLines(lines, analysisType);
  const warnings = buildWarnings(fields);

  return {
    analysisType,
    fields,
    lines,
    rawText: text,
    storageId: '',
    warnings,
  };
};
