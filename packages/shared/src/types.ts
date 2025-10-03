export interface Coupon {
  id: string;
  merchant: string;
  description: string;
  expiresOn: string;
  terms?: string;
  createdAt?: string;
}

export interface Warranty {
  id: string;
  productName: string;
  merchant: string;
  purchaseDate: string;
  coverageEndsOn: string;
  coverageNotes?: string;
  createdAt?: string;
}
