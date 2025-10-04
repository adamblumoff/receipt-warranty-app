import { getTextFromFrame } from 'expo-text-recognition';
import type { BenefitType, VisionAnalysisResult } from '@receipt-warranty/shared';
import { deriveAnalysisFromText } from '@receipt-warranty/shared';

export const analyzeImageLocally = async (
  uri: string,
  analysisType: BenefitType,
): Promise<VisionAnalysisResult | null> => {
  try {
    const localStart = Date.now();
    const lines = await getTextFromFrame(uri);
    const duration = Date.now() - localStart;
    console.log('⏱️ [local-ocr] recognize:', duration, 'ms');
    if (!lines || lines.length === 0) {
      return null;
    }
    const analysis = deriveAnalysisFromText(lines.join('\n'), analysisType);
    return analysis;
  } catch (error) {
    console.warn('Local OCR failed', error);
    return null;
  }
};
