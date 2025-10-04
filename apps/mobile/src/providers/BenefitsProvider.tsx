import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useConvex, useMutation } from 'convex/react';
import { v4 as uuid } from 'uuid';
import type {
  AnalyzeBenefitImageParams,
  Coupon,
  VisionAnalysisResult,
  Warranty,
} from '@receipt-warranty/shared';

import { api } from '../../../../convex/_generated/api';
import {
  getSampleBenefits,
  loadBenefits,
  saveBenefits,
  type StoredBenefits,
} from '../services/benefitsStorage';

import type { Id } from '../../../../convex/_generated/dataModel';

interface BenefitsContextValue {
  coupons: Coupon[];
  warranties: Warranty[];
  loading: boolean;
  addCoupon: (coupon: Coupon) => Promise<void>;
  addWarranty: (warranty: Warranty) => Promise<void>;
  removeCoupon: (couponId: string) => Promise<void>;
  removeWarranty: (warrantyId: string) => Promise<void>;
  getCouponById: (id: string) => Coupon | undefined;
  getWarrantyById: (id: string) => Warranty | undefined;
  refreshBenefits: () => Promise<void>;
  resetToSampleData: () => Promise<void>;
  analyzeBenefitImage: (params: AnalyzeBenefitImageParams) => Promise<VisionAnalysisResult>;
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
  const addCouponMutation = useMutation(api.mutations.benefits.addCoupon);
  const addWarrantyMutation = useMutation(api.mutations.benefits.addWarranty);
  const deleteCouponMutation = useMutation(api.mutations.benefits.deleteCoupon);
  const deleteWarrantyMutation = useMutation(api.mutations.benefits.deleteWarranty);
  const generateUploadUrl = useMutation(api.mutations.uploads.generateUploadUrl);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const couponsRef = useRef<Coupon[]>([]);
  const warrantiesRef = useRef<Warranty[]>([]);

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
        couponsRef.current = stored.coupons;
        warrantiesRef.current = stored.warranties;
      } else {
        const sample = getSampleBenefits();
        setCoupons(sample.coupons);
        setWarranties(sample.warranties);
        couponsRef.current = sample.coupons;
        warrantiesRef.current = sample.warranties;
        await saveBenefits(sample);
      }
      setHydrated(true);
      setInitializing(false);
    }

    void hydrateFromStorage();
  }, []);

  useEffect(() => {
    couponsRef.current = coupons;
  }, [coupons]);

  useEffect(() => {
    warrantiesRef.current = warranties;
  }, [warranties]);

  const fetchRemote = useCallback(async () => {
    setSyncing(true);
    try {
      let nextCoupons = couponsRef.current;
      const freshCoupons = await convex.query(api.queries.benefits.listCoupons, {});
      if (Array.isArray(freshCoupons)) {
        nextCoupons = (freshCoupons as CouponDoc[]).map(mapCoupon);
        setCoupons(nextCoupons);
        couponsRef.current = nextCoupons;
      }

      let nextWarranties = warrantiesRef.current;
      const freshWarranties = await convex.query(api.queries.benefits.listWarranties, {});
      if (Array.isArray(freshWarranties)) {
        nextWarranties = (freshWarranties as WarrantyDoc[]).map(mapWarranty);
        setWarranties(nextWarranties);
        warrantiesRef.current = nextWarranties;
      }

      await persist({ coupons: nextCoupons, warranties: nextWarranties });
    } catch (error) {
      console.warn('Failed to fetch benefits from Convex', error);
    } finally {
      setSyncing(false);
    }
  }, [convex, persist]);

  useEffect(() => {
    if (hydrated) {
      void fetchRemote();
    }
  }, [hydrated, fetchRemote]);

  const addCoupon = useCallback<BenefitsContextValue['addCoupon']>(
    async (coupon) => {
      const createdAt = coupon.createdAt ?? new Date().toISOString();
      const localCoupon: Coupon = {
        id: coupon.id ?? `local-${uuid()}`,
        merchant: coupon.merchant,
        description: coupon.description,
        expiresOn: coupon.expiresOn,
        terms: coupon.terms,
        createdAt,
      };

      const currentCoupons = couponsRef.current;
      const nextCoupons = [localCoupon, ...currentCoupons];
      setCoupons(nextCoupons);
      couponsRef.current = nextCoupons;
      await persist({ coupons: nextCoupons, warranties: warrantiesRef.current });

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
    [addCouponMutation, fetchRemote, persist],
  );

  const addWarranty = useCallback<BenefitsContextValue['addWarranty']>(
    async (warranty) => {
      const createdAt = warranty.createdAt ?? new Date().toISOString();
      const localWarranty: Warranty = {
        id: warranty.id ?? `local-${uuid()}`,
        productName: warranty.productName,
        merchant: warranty.merchant,
        purchaseDate: warranty.purchaseDate,
        coverageEndsOn: warranty.coverageEndsOn,
        coverageNotes: warranty.coverageNotes,
        createdAt,
      };

      const currentWarranties = warrantiesRef.current;
      const nextWarranties = [localWarranty, ...currentWarranties];
      setWarranties(nextWarranties);
      warrantiesRef.current = nextWarranties;
      await persist({ coupons: couponsRef.current, warranties: nextWarranties });

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
    [addWarrantyMutation, fetchRemote, persist],
  );

  const getCouponById = useCallback(
    (id: string) => coupons.find((coupon) => coupon.id === id),
    [coupons],
  );

  const getWarrantyById = useCallback(
    (id: string) => warranties.find((warranty) => warranty.id === id),
    [warranties],
  );

  const removeCoupon = useCallback<BenefitsContextValue['removeCoupon']>(
    async (couponId) => {
      const nextCoupons = couponsRef.current.filter((coupon) => coupon.id !== couponId);
      setCoupons(nextCoupons);
      couponsRef.current = nextCoupons;
      await persist({ coupons: nextCoupons, warranties: warrantiesRef.current });

      if (!couponId.startsWith('local-')) {
        try {
          await deleteCouponMutation({ id: couponId as Id<'coupons'> });
          void fetchRemote();
        } catch (error) {
          console.warn('Failed to delete coupon from Convex', error);
        }
      }
    },
    [deleteCouponMutation, fetchRemote, persist],
  );

  const removeWarranty = useCallback<BenefitsContextValue['removeWarranty']>(
    async (warrantyId) => {
      const nextWarranties = warrantiesRef.current.filter((warranty) => warranty.id !== warrantyId);
      setWarranties(nextWarranties);
      warrantiesRef.current = nextWarranties;
      await persist({ coupons: couponsRef.current, warranties: nextWarranties });

      if (!warrantyId.startsWith('local-')) {
        try {
          await deleteWarrantyMutation({ id: warrantyId as Id<'warranties'> });
          void fetchRemote();
        } catch (error) {
          console.warn('Failed to delete warranty from Convex', error);
        }
      }
    },
    [deleteWarrantyMutation, fetchRemote, persist],
  );

  const refreshBenefits = useCallback(async () => {
    await fetchRemote();
  }, [fetchRemote]);

  const resetToSampleData = useCallback(async () => {
    const sample = getSampleBenefits();
    setCoupons(sample.coupons);
    setWarranties(sample.warranties);
    couponsRef.current = sample.coupons;
    warrantiesRef.current = sample.warranties;
    await saveBenefits(sample);
  }, []);

  const analyzeBenefitImage = useCallback<BenefitsContextValue['analyzeBenefitImage']>(
    async ({ uri, mimeType, benefitType }) => {
      const uploadUrl = await generateUploadUrl({});
      const fileResponse = await fetch(uri);
      const fileBlob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
        },
        body: fileBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      const payload = (await uploadResponse.json()) as { storageId?: string };
      if (!payload.storageId) {
        throw new Error('Convex upload response missing storageId');
      }

      const analysis = (await convex.action(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        api['actions/vision'].analyzeBenefitImage,
        {
          storageId: payload.storageId,
          analyzeAs: benefitType,
        },
      )) as VisionAnalysisResult;

      return analysis;
    },
    [convex, generateUploadUrl],
  );

  const value = useMemo(
    () => ({
      coupons,
      warranties,
      loading: initializing || syncing,
      addCoupon,
      addWarranty,
      removeCoupon,
      removeWarranty,
      getCouponById,
      getWarrantyById,
      refreshBenefits,
      resetToSampleData,
      analyzeBenefitImage,
    }),
    [
      coupons,
      warranties,
      initializing,
      syncing,
      addCoupon,
      addWarranty,
      removeCoupon,
      removeWarranty,
      getCouponById,
      getWarrantyById,
      refreshBenefits,
      resetToSampleData,
      analyzeBenefitImage,
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
