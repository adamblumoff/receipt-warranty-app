interface CouponPayload {
  merchant: string;
  description: string;
  expiresOn: string;
  terms?: string;
}

interface WarrantyPayload {
  productName: string;
  merchant: string;
  purchaseDate: string;
  coverageEndsOn: string;
  coverageNotes?: string;
}

export async function addCoupon(_args: CouponPayload): Promise<{ success: boolean }> {
  console.log('addCoupon called', _args);
  // TODO: replace with Convex mutation once backend wiring is ready.
  return { success: false };
}

export async function addWarranty(_args: WarrantyPayload): Promise<{ success: boolean }> {
  console.log('addWarranty called', _args);
  // TODO: replace with Convex mutation once backend wiring is ready.
  return { success: false };
}
