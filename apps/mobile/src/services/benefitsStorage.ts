import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coupon, Warranty } from '@receipt-warranty/shared';

const STORAGE_KEY = 'benefit-wallet/v1';

export interface StoredBenefits {
  coupons: Coupon[];
  warranties: Warranty[];
}

export const loadBenefits = async (): Promise<StoredBenefits | undefined> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as StoredBenefits;
  } catch (error) {
    console.warn('Failed to load benefits from storage', error);
    return undefined;
  }
};

export const saveBenefits = async (benefits: StoredBenefits): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(benefits));
  } catch (error) {
    console.warn('Failed to persist benefits to storage', error);
  }
};

export const clearBenefits = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear benefits from storage', error);
  }
};
