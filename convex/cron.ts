import { cronJobs } from 'convex/server';

// TODO: Schedule `checkExpiringBenefits` once reminder notifications are implemented.

const crons = cronJobs();

export default crons;
