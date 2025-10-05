import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  coupons: defineTable({
    merchant: v.string(),
    description: v.string(),
    expiresOn: v.string(),
    terms: v.optional(v.string()),
    createdAt: v.string(),
    reminderState: v.optional(
      v.object({
        sevenDaySentAt: v.optional(v.string()),
        oneDaySentAt: v.optional(v.string()),
      }),
    ),
  }),
  warranties: defineTable({
    productName: v.string(),
    merchant: v.string(),
    purchaseDate: v.string(),
    coverageEndsOn: v.string(),
    coverageNotes: v.optional(v.string()),
    createdAt: v.string(),
    reminderState: v.optional(
      v.object({
        sevenDaySentAt: v.optional(v.string()),
        oneDaySentAt: v.optional(v.string()),
      }),
    ),
  }),
  reminderEvents: defineTable({
    benefitId: v.string(),
    benefitType: v.union(v.literal('coupon'), v.literal('warranty')),
    thresholdDays: v.number(),
    triggeredAt: v.string(),
    expiresOn: v.string(),
  }).index('by_benefit', ['benefitId', 'benefitType', 'thresholdDays']),
});
