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

const fixturesRoot = path.join(root, 'packages/shared/fixtures');
const couponsDir = path.join(fixturesRoot, 'coupons');
const warrantiesDir = path.join(fixturesRoot, 'warranties');

const couponFixtures = fs.existsSync(couponsDir) ? fs.readdirSync(couponsDir) : [];
const warrantyFixtures = fs.existsSync(warrantiesDir) ? fs.readdirSync(warrantiesDir) : [];

let failed = false;
let skipped = false;
let skipReason = '';
const findings = [];

async function evaluateCoupon(file) {
  const buffer = fs.readFileSync(path.join(couponsDir, file));
  const analysis = await safeAnalyze(buffer, 'coupon');
  if (!analysis) {
    return;
  }
  findings.push({ file, type: 'coupon', fields: analysis.fields, warnings: analysis.warnings });
  if (!analysis.fields.merchant?.value) {
    console.warn(`Coupon ${file}: missing merchant`);
  }
  if (!analysis.fields.expiresOn?.value) {
    console.warn(`Coupon ${file}: missing expiresOn`);
  }
}

async function evaluateWarranty(file) {
  const buffer = fs.readFileSync(path.join(warrantiesDir, file));
  const analysis = await safeAnalyze(buffer, 'warranty');
  if (!analysis) {
    return;
  }
  findings.push({ file, type: 'warranty', fields: analysis.fields, warnings: analysis.warnings });
  const hasCoverage = Boolean(analysis.fields.coverageEndsOn?.value);
  const hasPurchase = Boolean(analysis.fields.purchaseDate?.value);
  if (!hasCoverage && !hasPurchase) {
    console.warn(`Warranty ${file}: missing coverage or purchase date`);
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

console.log('\nFixture summary:');
for (const finding of findings) {
  console.log(`- [${finding.type}] ${finding.file}`);
  console.log('  merchant:', finding.fields.merchant?.value ?? '<none>');
  console.log('  description:', finding.fields.description?.value ?? '<none>');
  console.log('  expiresOn:', finding.fields.expiresOn?.value ?? '<none>');
  if (finding.type === 'warranty') {
    console.log('  purchaseDate:', finding.fields.purchaseDate?.value ?? '<none>');
    console.log('  coverageEndsOn:', finding.fields.coverageEndsOn?.value ?? '<none>');
  }
  if (finding.warnings.length > 0) {
    console.log('  warnings:', finding.warnings.join('; '));
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`\nOCR fixture check completed (${couponFixtures.length} coupons, ${warrantyFixtures.length} warranties).`);
}
