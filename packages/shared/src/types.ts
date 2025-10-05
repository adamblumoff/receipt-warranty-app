export interface Coupon {
  id: string;
  merchant: string;
  description: string;
  expiresOn: string;
  terms?: string;
  createdAt?: string;
  reminderState?: ReminderState;
}

export interface Warranty {
  id: string;
  productName: string;
  merchant: string;
  purchaseDate: string;
  coverageEndsOn: string;
  coverageNotes?: string;
  createdAt?: string;
  reminderState?: ReminderState;
}

export type BenefitType = 'coupon' | 'warranty';

export interface VisionFieldSuggestion<T = string> {
  value: T;
  confidence: number;
  sourceText: string;
}

export interface VisionAnalysisResult {
  storageId: string;
  analysisType: BenefitType | 'unknown';
  rawText: string;
  lines: string[];
  fields: {
    merchant?: VisionFieldSuggestion;
    description?: VisionFieldSuggestion;
    expiresOn?: VisionFieldSuggestion;
    productName?: VisionFieldSuggestion;
    purchaseDate?: VisionFieldSuggestion;
    coverageEndsOn?: VisionFieldSuggestion;
    totalAmount?: VisionFieldSuggestion<number>;
  };
  warnings: string[];
  debug?: Record<string, unknown>;
}

export interface AnalyzeBenefitImageParams {
  uri: string;
  mimeType: string;
  benefitType?: BenefitType;
  originalFileName?: string;
}

export interface ReminderSummary {
  id: string;
  benefitId: string;
  benefitType: BenefitType;
  title: string;
  dueOn: string;
  daysUntil: number;
}

export interface ReminderState {
  sevenDaySentAt?: string;
  oneDaySentAt?: string;
}
