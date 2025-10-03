import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { ReceiptSummary } from '@receipt-warranty/shared';

import { mockReceipts } from '../data/mockReceipts';

interface ReceiptsContextValue {
  receipts: ReceiptSummary[];
  addReceipt: (receipt: ReceiptSummary) => void;
  getReceiptById: (id: string) => ReceiptSummary | undefined;
}

const ReceiptsContext = createContext<ReceiptsContextValue | undefined>(undefined);

interface ReceiptsProviderProps {
  children: React.ReactNode;
}

export const ReceiptsProvider = ({ children }: ReceiptsProviderProps): React.ReactElement => {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>(mockReceipts);

  const addReceipt = useCallback((receipt: ReceiptSummary) => {
    setReceipts((current) => [receipt, ...current]);
  }, []);

  const getReceiptById = useCallback(
    (id: string) => receipts.find((receipt) => receipt.id === id),
    [receipts],
  );

  const value = useMemo(
    () => ({
      receipts,
      addReceipt,
      getReceiptById,
    }),
    [receipts, addReceipt, getReceiptById],
  );

  return <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>;
};

export const useReceipts = (): ReceiptsContextValue => {
  const context = useContext(ReceiptsContext);
  if (!context) {
    throw new Error('useReceipts must be used within a ReceiptsProvider');
  }
  return context;
};
