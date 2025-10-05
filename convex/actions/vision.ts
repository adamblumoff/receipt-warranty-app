'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import type { VisionAnalysisResult } from '../../packages/shared/src/types';
import { analyzeImageBuffer } from '../../packages/shared/src/vision/core';

const extractMultipartFile = (
  buffer: Buffer,
  contentType?: string,
): { file: Buffer; inferredType?: string } | null => {
  const detectBoundary = (): string | null => {
    if (contentType && contentType.includes('multipart/form-data')) {
      const match = /boundary="?([^\s;"]+)"?/i.exec(contentType);
      if (match) {
        return match[1];
      }
    }

    const searchLimit = Math.min(buffer.length, 2048);
    for (let i = 0; i < searchLimit - 2; i++) {
      if (buffer[i] === 0x2d && buffer[i + 1] === 0x2d) {
        let end = i + 2;
        while (end < buffer.length && buffer[end] !== 0x0d && buffer[end] !== 0x0a) {
          end += 1;
        }
        if (end > i + 2) {
          return buffer
            .subarray(i + 2, end)
            .toString('ascii')
            .trim();
        }
      }
    }
    return null;
  };

  const boundary = detectBoundary();
  if (!boundary) {
    return null;
  }

  const boundaryBuf = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  let cursor = 0;

  while (cursor < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuf, cursor);
    if (boundaryIndex === -1) {
      break;
    }
    let sectionStart = boundaryIndex + boundaryBuf.length;
    if (buffer[sectionStart] === 0x2d && buffer[sectionStart + 1] === 0x2d) {
      break;
    }
    if (buffer[sectionStart] === 0x0d && buffer[sectionStart + 1] === 0x0a) {
      sectionStart += 2;
    }

    const headerEnd = buffer.indexOf(headerSeparator, sectionStart);
    if (headerEnd === -1) {
      break;
    }

    const headers = buffer.subarray(sectionStart, headerEnd).toString('utf8');
    if (!/name="file"/i.test(headers)) {
      cursor = headerEnd + headerSeparator.length;
      continue;
    }

    const dataStart = headerEnd + headerSeparator.length;
    let nextBoundary = buffer.indexOf(boundaryBuf, dataStart);
    if (nextBoundary === -1) {
      nextBoundary = buffer.length;
    }
    let dataEnd = nextBoundary;
    if (buffer[dataEnd - 2] === 0x0d && buffer[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    }

    const file = buffer.subarray(dataStart, dataEnd);
    const detectedTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers);
    return { file, inferredType: detectedTypeMatch?.[1]?.trim() };
  }

  return null;
};

export const analyzeBenefitImage = action({
  args: {
    storageId: v.id('_storage'),
    analyzeAs: v.optional(v.union(v.literal('coupon'), v.literal('warranty'))),
  },
  handler: async (ctx, args): Promise<VisionAnalysisResult> => {
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError('Uploaded file not found');
    }

    const arrayBuffer = await blob.arrayBuffer();
    let originalBuffer = Buffer.from(arrayBuffer);

    const multipart = extractMultipartFile(originalBuffer, blob.type);
    if (multipart) {
      originalBuffer = multipart.file;
    }

    const analysis = await analyzeImageBuffer(originalBuffer, args.analyzeAs ?? 'unknown');

    return {
      ...analysis,
      storageId: args.storageId,
    };
  },
});
