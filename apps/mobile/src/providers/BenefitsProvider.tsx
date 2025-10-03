import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Coupon, Warranty } from '@receipt-warranty/shared';

import { mockCoupons, mockWarranties } from '../data/mockBenefits';

interface BenefitsContextValue {
  coupons: Coupon[];
  warranties: Warranty[];
  addCoupon: (coupon: Coupon) => void;
  addWarranty: (warranty: Warranty) => void;
  getCouponById: (id: string) => Coupon | undefined;
  getWarrantyById: (id: string) => Warranty | undefined;
}

const BenefitsContext = createContext<BenefitsContextValue | undefined>(undefined);

interface BenefitsProviderProps {
  children: React.ReactNode;
}

export const BenefitsProvider = ({ children }: BenefitsProviderProps): React.ReactElement => {
  const [coupons, setCoupons] = useState<Coupon[]>(mockCoupons);
  const [warranties, setWarranties] = useState<Warranty[]>(mockWarranties);

  const addCoupon = useCallback((coupon: Coupon) => {
    setCoupons((current) => [coupon, ...current]);
  }, []);

  const addWarranty = useCallback((warranty: Warranty) => {
    setWarranties((current) => [warranty, ...current]);
  }, []);

  const getCouponById = useCallback(
    (id: string) => coupons.find((coupon) => coupon.id === id),
    [coupons],
  );

  const getWarrantyById = useCallback(
    (id: string) => warranties.find((warranty) => warranty.id === id),
    [warranties],
  );

  const value = useMemo(
    () => ({
      coupons,
      warranties,
      addCoupon,
      addWarranty,
      getCouponById,
      getWarrantyById,
    }),
    [coupons, warranties, addCoupon, addWarranty, getCouponById, getWarrantyById],
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
