import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Coupon, Warranty } from '@receipt-warranty/shared';

import { mockCoupons, mockWarranties } from '../data/mockBenefits';
import type { StoredBenefits } from '../services/benefitsStorage';
import { loadBenefits, saveBenefits } from '../services/benefitsStorage';

interface BenefitsContextValue {
  coupons: Coupon[];
  warranties: Warranty[];
  loading: boolean;
  addCoupon: (coupon: Coupon) => Promise<void>;
  addWarranty: (warranty: Warranty) => Promise<void>;
  getCouponById: (id: string) => Coupon | undefined;
  getWarrantyById: (id: string) => Warranty | undefined;
  refreshBenefits: () => Promise<void>;
  resetToSampleData: () => Promise<void>;
}

const BenefitsContext = createContext<BenefitsContextValue | undefined>(undefined);

interface BenefitsProviderProps {
  children: React.ReactNode;
}

const getSampleBenefits = (): StoredBenefits => ({
  coupons: mockCoupons.map((coupon) => ({ ...coupon })),
  warranties: mockWarranties.map((warranty) => ({ ...warranty })),
});

export const BenefitsProvider = ({ children }: BenefitsProviderProps): React.ReactElement => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const hydrateFromStorage = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await loadBenefits();
      if (stored && (stored.coupons.length > 0 || stored.warranties.length > 0)) {
        setCoupons(stored.coupons);
        setWarranties(stored.warranties);
        return;
      }
      const sample = getSampleBenefits();
      setCoupons(sample.coupons);
      setWarranties(sample.warranties);
      await saveBenefits(sample);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  const persistBenefits = useCallback(async (nextCoupons: Coupon[], nextWarranties: Warranty[]) => {
    await saveBenefits({ coupons: nextCoupons, warranties: nextWarranties });
  }, []);

  const addCoupon = useCallback<BenefitsContextValue['addCoupon']>(
    async (coupon) => {
      const nextCoupons = [coupon, ...coupons];
      setCoupons(nextCoupons);
      await persistBenefits(nextCoupons, warranties);
    },
    [coupons, persistBenefits, warranties],
  );

  const addWarranty = useCallback<BenefitsContextValue['addWarranty']>(
    async (warranty) => {
      const nextWarranties = [warranty, ...warranties];
      setWarranties(nextWarranties);
      await persistBenefits(coupons, nextWarranties);
    },
    [coupons, persistBenefits, warranties],
  );

  const getCouponById = useCallback(
    (id: string) => coupons.find((coupon) => coupon.id === id),
    [coupons],
  );

  const getWarrantyById = useCallback(
    (id: string) => warranties.find((warranty) => warranty.id === id),
    [warranties],
  );

  const refreshBenefits = useCallback(async () => {
    await hydrateFromStorage();
  }, [hydrateFromStorage]);

  const resetToSampleData = useCallback(async () => {
    const sample = getSampleBenefits();
    setCoupons(sample.coupons);
    setWarranties(sample.warranties);
    await saveBenefits(sample);
  }, []);

  const value = useMemo(
    () => ({
      coupons,
      warranties,
      loading,
      addCoupon,
      addWarranty,
      getCouponById,
      getWarrantyById,
      refreshBenefits,
      resetToSampleData,
    }),
    [
      coupons,
      warranties,
      loading,
      addCoupon,
      addWarranty,
      getCouponById,
      getWarrantyById,
      refreshBenefits,
      resetToSampleData,
    ],
  );

  return <BenefitsContext.Provider value={value}>{children}</BenefitsContext.Provider>;
};

export const useBenefits = (): BenefitsContextValue => {
  const context = useContext(BenefitsContext);
  if (!context) {
    throw new Error('useBenefits must be used within a BenefitsProvider');
  }
  return context;
};
