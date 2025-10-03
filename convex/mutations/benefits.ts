import { mutation } from '../_generated/server';
import { v } from 'convex/values';

export const addCoupon = mutation({
  args: {
    merchant: v.string(),
    description: v.string(),
    expiresOn: v.string(),
    terms: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = args.createdAt ?? new Date().toISOString();
    const id = await ctx.db.insert('coupons', {
      merchant: args.merchant,
      description: args.description,
      expiresOn: args.expiresOn,
      terms: args.terms,
      createdAt,
    });

    return await ctx.db.get(id);
  },
});

export const addWarranty = mutation({
  args: {
    productName: v.string(),
    merchant: v.string(),
    purchaseDate: v.string(),
    coverageEndsOn: v.string(),
    coverageNotes: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = args.createdAt ?? new Date().toISOString();
    const id = await ctx.db.insert('warranties', {
      productName: args.productName,
      merchant: args.merchant,
      purchaseDate: args.purchaseDate,
      coverageEndsOn: args.coverageEndsOn,
      coverageNotes: args.coverageNotes,
      createdAt,
    });

    return await ctx.db.get(id);
  },
});

export const deleteCoupon = mutation({
  args: {
    id: v.id('coupons'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const deleteWarranty = mutation({
  args: {
    id: v.id('warranties'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
