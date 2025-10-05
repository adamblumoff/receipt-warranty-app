import { internalMutation } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';

type BenefitDoc = Doc<'coupons'> | Doc<'warranties'>;

type BenefitType = 'coupon' | 'warranty';

const THRESHOLDS = [
  { key: 'sevenDaySentAt' as const, days: 7 },
  { key: 'oneDaySentAt' as const, days: 1 },
];

export const checkExpiringBenefits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();

    const process = async (
      doc: BenefitDoc,
      type: BenefitType,
      relevantIso: string,
      label: string,
    ) => {
      const targetDate = new Date(relevantIso);
      if (Number.isNaN(targetDate.getTime())) {
        return;
      }

      for (const threshold of THRESHOLDS) {
        const reminderDate = new Date(targetDate);
        reminderDate.setUTCDate(reminderDate.getUTCDate() - threshold.days);

        if (now >= reminderDate && now <= targetDate) {
          const alreadySent = doc.reminderState?.[threshold.key];
          if (!alreadySent) {
            const triggeredAt = new Date().toISOString();
            console.log(
              `[reminder] ${type} ${label} threshold ${threshold.days} day(s) before ${relevantIso} triggered at ${triggeredAt}`,
            );

            await ctx.db.patch(doc._id as Id<'coupons'> | Id<'warranties'>, {
              reminderState: {
                ...(doc.reminderState ?? {}),
                [threshold.key]: triggeredAt,
              },
            });

            await ctx.db.insert('reminderEvents', {
              benefitId: doc._id as Id<'coupons'> | Id<'warranties'>,
              benefitType: type,
              thresholdDays: threshold.days,
              triggeredAt,
              expiresOn: relevantIso,
            });
          }
        }
      }
    };

    const coupons = await ctx.db.query('coupons').collect();
    for (const coupon of coupons) {
      await process(coupon, 'coupon', coupon.expiresOn, coupon.merchant);
    }

    const warranties = await ctx.db.query('warranties').collect();
    for (const warranty of warranties) {
      await process(warranty, 'warranty', warranty.coverageEndsOn, warranty.productName);
    }
  },
});
