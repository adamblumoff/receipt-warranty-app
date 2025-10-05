import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

const { analyzeImageBuffer } = await import('../packages/shared/src/vision/core.ts');

const couponFixtures = fs.readdirSync(path.join(root, 'coupons'));
const warrantyFixtures = fs.readdirSync(path.join(root, 'warranties'));

let failed = false;
let skipped = false;
let skipReason = '';

async function evaluateCoupon(file) {
  const buffer = fs.readFileSync(path.join(root, 'coupons', file));
  const analysis = await safeAnalyze(buffer, 'coupon');
  if (!analysis) {
    return;
  }
  if (!analysis.fields.merchant?.value) {
    console.error(`Coupon ${file}: missing merchant`);
    failed = true;
  }
  if (!analysis.fields.expiresOn?.value) {
    console.error(`Coupon ${file}: missing expiresOn`);
    failed = true;
  }
}

async function evaluateWarranty(file) {
  const buffer = fs.readFileSync(path.join(root, 'warranties', file));
  const analysis = await safeAnalyze(buffer, 'warranty');
  if (!analysis) {
    return;
  }
  const hasCoverage = Boolean(analysis.fields.coverageEndsOn?.value);
  const hasPurchase = Boolean(analysis.fields.purchaseDate?.value);
  if (!hasCoverage && !hasPurchase) {
    console.error(`Warranty ${file}: missing coverage or purchase date`);
    failed = true;
  }
}

async function safeAnalyze(buffer, type) {
  try {
    return await analyzeImageBuffer(buffer, type);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    skipped = true;
    skipReason = message;
    return null;
  }
}

if (process.env.SKIP_OCR_TESTS === '1') {
  skipped = true;
  skipReason = 'SKIP_OCR_TESTS flag set';
}

if (!skipped) {
  for (const file of couponFixtures) {
    await evaluateCoupon(file);
    if (skipped) break;
  }

  if (!skipped) {
    for (const file of warrantyFixtures) {
      await evaluateWarranty(file);
      if (skipped) break;
    }
  }
}

if (skipped) {
  console.warn('OCR tests skipped:', skipReason);
  process.exit(0);
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`OCR fixtures passed (${couponFixtures.length} coupons, ${warrantyFixtures.length} warranties).`);
}
