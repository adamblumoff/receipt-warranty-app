/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as cron from "../cron.js";
import type * as jobs_checkExpiringBenefits from "../jobs/checkExpiringBenefits.js";
import type * as mutations_benefits from "../mutations/benefits.js";
import type * as queries_benefits from "../queries/benefits.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  cron: typeof cron;
  "jobs/checkExpiringBenefits": typeof jobs_checkExpiringBenefits;
  "mutations/benefits": typeof mutations_benefits;
  "queries/benefits": typeof queries_benefits;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
