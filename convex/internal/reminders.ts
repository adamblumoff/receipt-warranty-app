import { internalAction, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';

const THRESHOLDS = [
  { key: 'sevenDaySentAt' as const, days: 7 },
  { key: 'oneDaySentAt' as const, days: 1 },
];

type BenefitDoc = Doc<'coupons'> | Doc<'warranties'>;
type BenefitType = 'coupon' | 'warranty';

type PendingPush = {
  type: BenefitType;
  label: string;
  due: string;
  thresholdDays: number;
};

type PushArgs = {
  reminders: PendingPush[];
  tokens: string[];
};

export const checkExpiringBenefits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const pushTokens = await ctx.db.query('pushTokens').collect();
    const pendingPush: PendingPush[] = [];

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
        const diffMs = targetDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysDiff === threshold.days) {
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

            if (pushTokens.length > 0) {
              pendingPush.push({
                type,
                label,
                due: relevantIso,
                thresholdDays: threshold.days,
              });
            }
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

    if (pendingPush.length > 0 && pushTokens.length > 0) {
      await ctx.scheduler.runAfter(0, internal.internal.reminders.sendPushNotifications, {
        reminders: pendingPush,
        tokens: pushTokens.map((tokenDoc) => tokenDoc.token),
      });
    }
  },
});

export const sendPushNotifications = internalAction({
  args: {
    reminders: v.array(
      v.object({
        type: v.union(v.literal('coupon'), v.literal('warranty')),
        label: v.string(),
        due: v.string(),
        thresholdDays: v.number(),
      }),
    ),
    tokens: v.array(v.string()),
  },
  handler: async (ctx, args: PushArgs) => {
    if (args.tokens.length === 0 || args.reminders.length === 0) {
      return;
    }

    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('EXPO_ACCESS_TOKEN not set; skipping push notifications');
      return;
    }

    const messages = args.reminders.flatMap((reminder) => {
      const title =
        reminder.type === 'coupon' ? 'Coupon expiring soon' : 'Warranty coverage ending soon';
      const dueLabel = formatDueDate(reminder.due);
      const body = `${reminder.label} due on ${dueLabel}`;
      return args.tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          benefitType: reminder.type,
          label: reminder.label,
          dueOn: reminder.due,
          thresholdDays: reminder.thresholdDays,
        },
      }));
    });

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(messages),
      });

      const result: unknown = await response.json();
      if (!response.ok) {
        console.warn('Failed to send push notifications', result);
      }
    } catch (error) {
      console.warn('Error sending push notifications', error);
    }
  },
});

const formatDueDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};
