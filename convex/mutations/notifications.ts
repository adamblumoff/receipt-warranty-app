import { mutation } from '../_generated/server';
import { v } from 'convex/values';

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android'), v.literal('unknown')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    if (!existing) {
      await ctx.db.insert('pushTokens', {
        token: args.token,
        platform: args.platform,
        createdAt: new Date().toISOString(),
      });
    }
  },
});
