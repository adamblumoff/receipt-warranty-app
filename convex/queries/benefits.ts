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

export const listUpcomingReminders = query({
  handler: async (ctx) => {
    const now = new Date();
    const reminders: Array<{
      id: string;
      benefitId: string;
      benefitType: 'coupon' | 'warranty';
      title: string;
      dueOn: string;
      daysUntil: number;
      sourceDate: string;
    }> = [];

    const coupons = await ctx.db.query('coupons').collect();
    coupons.forEach((coupon) => {
      const days = daysUntil(coupon.expiresOn, now);
      if (days !== null && days >= 0 && days <= 7) {
        reminders.push({
          id: `${coupon._id}-coupon`,
          benefitId: coupon._id,
          benefitType: 'coupon',
          title: coupon.merchant,
          dueOn: coupon.expiresOn,
          daysUntil: days,
          sourceDate: coupon.expiresOn,
        });
      }
    });

    const warranties = await ctx.db.query('warranties').collect();
    warranties.forEach((warranty) => {
      const days = daysUntil(warranty.coverageEndsOn, now);
      if (days !== null && days >= 0 && days <= 7) {
        reminders.push({
          id: `${warranty._id}-warranty`,
          benefitId: warranty._id,
          benefitType: 'warranty',
          title: warranty.productName,
          dueOn: warranty.coverageEndsOn,
          daysUntil: days,
          sourceDate: warranty.coverageEndsOn,
        });
      }
    });

    reminders.sort((a, b) => new Date(a.dueOn).getTime() - new Date(b.dueOn).getTime());
    return reminders;
  },
});

const daysUntil = (iso: string, now: Date): number | null => {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const diff = target.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
