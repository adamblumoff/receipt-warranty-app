import { query } from '../_generated/server';

export const listCoupons = query({
  handler: async (ctx) => {
    return await ctx.db.query('coupons').order('desc').collect();
  },
});

export const listWarranties = query({
  handler: async (ctx) => {
    return await ctx.db.query('warranties').order('desc').collect();
  },
});
