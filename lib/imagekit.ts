/**
 * ImageKit.io Integration for MedEdPrep Instructor Tools
 *
 * Handles file uploads to ImageKit CDN for bug report screenshots.
 * Falls back gracefully if ImageKit is not configured.
 */

import ImageKit from '@imagekit/nodejs';
import { logger } from './logger.js';

const log = logger.child({ module: 'imagekit' });

// ImageKit client (singleton)
let client: ImageKit | null = null;

/**
 * Get ImageKit client (lazy initialization)
 */
function getClient(): ImageKit | null {
  if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    log.warn('ImageKit not configured - uploads disabled');
    return null;
  }

  if (!client) {
    client = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      baseURL: process.env.IMAGEKIT_BASE_URL,
    });
    log.info('ImageKit client initialized');
  }

  return client;
}

/**
 * Check if ImageKit is configured
 */
export function isImageKitConfigured(): boolean {
  return !!(process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT);
}

/**
 * Upload an image to ImageKit
 *
 * @param base64Data - Image data as Base64 string or data URI
 * @param fileName - Desired file name (e.g., 'screenshot-123.png')
 * @param folder - ImageKit folder (e.g., '/bug-reports/demo')
 * @returns ImageKit URL and file ID, or null on failure
 */
export async function uploadImage(
  base64Data: string,
  fileName: string,
  folder: string,
): Promise<{ url: string; fileId: string } | null> {
  const ikClient = getClient();
  if (!ikClient) {
    log.warn('ImageKit not configured - skipping upload');
    return null;
  }

  try {
    const result = await ikClient.files.upload({
      file: base64Data,
      fileName: fileName.endsWith('.png') ? fileName : `${fileName}.png`,
      folder,
      useUniqueFileName: true, // Avoid naming conflicts
      tags: ['bug-report', 'screenshot'],
    });

    log.info({ fileId: result.fileId, url: result.url, folder }, 'Image uploaded to ImageKit');

    if (!result.fileId || !result.url) {
      log.error({ result, fileName, folder }, 'ImageKit upload missing url or fileId');
      return null;
    }

    return {
      url: result.url,
      fileId: result.fileId,
    };
  } catch (err) {
    log.error({ err, fileName, folder }, 'Failed to upload image to ImageKit');
    return null;
  }
}

/**
 * Delete an image from ImageKit
 *
 * @param fileId - ImageKit file ID
 */
export async function deleteImage(fileId: string): Promise<void> {
  if (!fileId) return;

  const ikClient = getClient();
  if (!ikClient) return;

  try {
    await ikClient.files.delete(fileId);
    log.info({ fileId }, 'Image deleted from ImageKit');
  } catch (err) {
    log.error({ err, fileId }, 'Failed to delete image from ImageKit');
  }
}
