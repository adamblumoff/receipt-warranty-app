import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { BenefitType, VisionAnalysisResult } from '@receipt-warranty/shared';
import { deriveAnalysisFromText } from '@receipt-warranty/shared';

export const analyzeImageLocally = async (
  uri: string,
  analysisType: BenefitType,
): Promise<VisionAnalysisResult | null> => {
  try {
    const localStart = Date.now();
    const result = await TextRecognition.recognize(uri);
    const duration = Date.now() - localStart;
    console.log('⏱️ [local-ocr] recognize:', duration, 'ms');
    if (!result?.text?.trim()) {
      return null;
    }
    const analysis = deriveAnalysisFromText(result.text, analysisType);
    return analysis;
  } catch (error) {
    console.warn('Local OCR failed', error);
    return null;
  }
};
