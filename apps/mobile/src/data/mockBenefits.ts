import type { Coupon, Warranty } from '@receipt-warranty/shared';

export const mockCoupons: Coupon[] = [
  {
    id: 'coupon-001',
    merchant: 'Target',
    description: '15% off electronics (one use)',
    expiresOn: '2025-11-15',
    terms: 'Valid in-store and online; excludes Apple products.',
    createdAt: '2025-10-01T15:30:00.000Z',
  },
  {
    id: 'coupon-002',
    merchant: 'Costco',
    description: '$20 off any appliance purchase over $150',
    expiresOn: '2025-12-01',
    createdAt: '2025-09-14T21:00:00.000Z',
  },
];

export const mockWarranties: Warranty[] = [
  {
    id: 'warranty-001',
    productName: 'Dyson V15 Detect Vacuum',
    merchant: 'Best Buy',
    purchaseDate: '2025-06-04',
    coverageEndsOn: '2027-06-04',
    coverageNotes:
      'Includes accidental damage protection; file a claim via Best Buy Total Tech portal.',
    createdAt: '2025-06-04T12:04:00.000Z',
  },
  {
    id: 'warranty-002',
    productName: 'LG OLED C4 55" TV',
    merchant: 'LG Care',
    purchaseDate: '2025-03-19',
    coverageEndsOn: '2028-03-19',
    createdAt: '2025-03-19T19:30:00.000Z',
  },
];
