import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  coupons: defineTable({
    merchant: v.string(),
    description: v.string(),
    expiresOn: v.string(),
    terms: v.optional(v.string()),
    createdAt: v.string(),
  }),
  warranties: defineTable({
    productName: v.string(),
    merchant: v.string(),
    purchaseDate: v.string(),
    coverageEndsOn: v.string(),
    coverageNotes: v.optional(v.string()),
    createdAt: v.string(),
  }),
});
