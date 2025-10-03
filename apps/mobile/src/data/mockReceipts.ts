import type { ReceiptSummary } from '@receipt-warranty/shared';

export const mockReceipts: ReceiptSummary[] = [
  {
    id: 'rec-001',
    vendor: 'Best Buy',
    purchaseDate: '2025-09-18',
    total: 249.99,
    warrantyExpiresOn: '2026-09-18',
  },
  {
    id: 'rec-002',
    vendor: 'Home Depot',
    purchaseDate: '2025-08-03',
    total: 189.5,
    warrantyExpiresOn: '2026-08-03',
  },
  {
    id: 'rec-003',
    vendor: 'IKEA',
    purchaseDate: '2025-04-22',
    total: 79.99,
    warrantyExpiresOn: '2026-04-22',
  },
];
