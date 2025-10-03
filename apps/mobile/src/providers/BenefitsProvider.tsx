import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useConvex, useMutation } from 'convex/react';
import { v4 as uuid } from 'uuid';
import type { Coupon, Warranty } from '@receipt-warranty/shared';

import { api } from '../../../convex/_generated/api';
import {
  getSampleBenefits,
  loadBenefits,
  saveBenefits,
  type StoredBenefits,
} from '../services/benefitsStorage';

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

type CouponDoc = {
  _id: string;
  merchant: string;
  description: string;
  expiresOn: string;
  terms?: string | null;
  createdAt: string;
};

type WarrantyDoc = {
  _id: string;
  productName: string;
  merchant: string;
  purchaseDate: string;
  coverageEndsOn: string;
  coverageNotes?: string | null;
  createdAt: string;
};

const mapCoupon = (doc: CouponDoc): Coupon => ({
  id: doc._id,
  merchant: doc.merchant,
  description: doc.description,
  expiresOn: doc.expiresOn,
  terms: doc.terms ?? undefined,
  createdAt: doc.createdAt,
});

const mapWarranty = (doc: WarrantyDoc): Warranty => ({
  id: doc._id,
  productName: doc.productName,
  merchant: doc.merchant,
  purchaseDate: doc.purchaseDate,
  coverageEndsOn: doc.coverageEndsOn,
  coverageNotes: doc.coverageNotes ?? undefined,
  createdAt: doc.createdAt,
});

export const BenefitsProvider = ({ children }: BenefitsProviderProps): React.ReactElement => {
  const convex = useConvex();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const listCouponsRef = api['queries']['benefits'].listCoupons;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const listWarrantiesRef = api['queries']['benefits'].listWarranties;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const addCouponMutation = useMutation(api['actions']['benefits'].addCoupon);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const addWarrantyMutation = useMutation(api['actions']['benefits'].addWarranty);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const persist = useCallback(async (next: StoredBenefits) => {
    await saveBenefits(next);
  }, []);

  useEffect(() => {
    async function hydrateFromStorage() {
      setInitializing(true);
      const stored = await loadBenefits();
      if (stored) {
        setCoupons(stored.coupons);
        setWarranties(stored.warranties);
      } else {
        const sample = getSampleBenefits();
        setCoupons(sample.coupons);
        setWarranties(sample.warranties);
        await saveBenefits(sample);
      }
      setHydrated(true);
      setInitializing(false);
    }

    void hydrateFromStorage();
  }, []);

  const fetchRemote = useCallback(async () => {
    if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
      return;
    }
    setSyncing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const freshCoupons = await convex.query(listCouponsRef, {});
      if (Array.isArray(freshCoupons)) {
        const mappedCoupons = (freshCoupons as CouponDoc[]).map(mapCoupon);
        setCoupons(mappedCoupons);
        await persist({ coupons: mappedCoupons, warranties });
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const freshWarranties = await convex.query(listWarrantiesRef, {});
      if (Array.isArray(freshWarranties)) {
        const mappedWarranties = (freshWarranties as WarrantyDoc[]).map(mapWarranty);
        setWarranties(mappedWarranties);
        await persist({ coupons, warranties: mappedWarranties });
      }
    } catch (error) {
      console.warn('Failed to fetch benefits from Convex', error);
    } finally {
      setSyncing(false);
    }
  }, [convex, coupons, listCouponsRef, listWarrantiesRef, persist, warranties]);

  useEffect(() => {
    if (hydrated) {
      void fetchRemote();
    }
  }, [hydrated, fetchRemote]);

  const addCoupon = useCallback<BenefitsContextValue['addCoupon']>(
    async (coupon) => {
      const createdAt = coupon.createdAt ?? new Date().toISOString();
      const localCoupon: Coupon = {
        id: coupon.id ?? uuid(),
        merchant: coupon.merchant,
        description: coupon.description,
        expiresOn: coupon.expiresOn,
        terms: coupon.terms,
        createdAt,
      };

      const nextCoupons = [localCoupon, ...coupons];
      setCoupons(nextCoupons);
      await persist({ coupons: nextCoupons, warranties });

      try {
        await addCouponMutation({
          merchant: localCoupon.merchant,
          description: localCoupon.description,
          expiresOn: localCoupon.expiresOn,
          terms: localCoupon.terms,
          createdAt,
        });
        void fetchRemote();
      } catch (error) {
        console.warn('Failed to sync coupon with Convex', error);
      }
    },
    [addCouponMutation, coupons, fetchRemote, persist, warranties],
  );

  const addWarranty = useCallback<BenefitsContextValue['addWarranty']>(
    async (warranty) => {
      const createdAt = warranty.createdAt ?? new Date().toISOString();
      const localWarranty: Warranty = {
        id: warranty.id ?? uuid(),
        productName: warranty.productName,
        merchant: warranty.merchant,
        purchaseDate: warranty.purchaseDate,
        coverageEndsOn: warranty.coverageEndsOn,
        coverageNotes: warranty.coverageNotes,
        createdAt,
      };

      const nextWarranties = [localWarranty, ...warranties];
      setWarranties(nextWarranties);
      await persist({ coupons, warranties: nextWarranties });

      try {
        await addWarrantyMutation({
          productName: localWarranty.productName,
          merchant: localWarranty.merchant,
          purchaseDate: localWarranty.purchaseDate,
          coverageEndsOn: localWarranty.coverageEndsOn,
          coverageNotes: localWarranty.coverageNotes,
          createdAt,
        });
        void fetchRemote();
      } catch (error) {
        console.warn('Failed to sync warranty with Convex', error);
      }
    },
    [addWarrantyMutation, coupons, fetchRemote, persist, warranties],
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
    await fetchRemote();
  }, [fetchRemote]);

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
      loading: initializing || syncing,
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
      initializing,
      syncing,
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
