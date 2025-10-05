import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'check-expiring-benefits',
  { hours: 24 },
  internal.internal.reminders.checkExpiringBenefits,
);

export default crons;
