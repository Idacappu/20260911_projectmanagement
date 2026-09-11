import type React from 'react';

/**
 * Helper to compress image blob and enforce 1920px max dimension
 * as required by SRS non-functional specification 6.1
 */
export async function processImageBlob(file: Blob, fileName = 'screenshot.png'): Promise<{
  fileName: string;
  dataUrl: string;
  fileType: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1920;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            fileName,
            dataUrl: event.target?.result as string,
            fileType: file.type || 'image/png',
          });
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type || 'image/png', 0.88);

        resolve({
          fileName,
          dataUrl,
          fileType: file.type || 'image/png',
        });
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract image from clipboard event
 */
export function extractImageFromClipboard(event: React.ClipboardEvent | ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      return item.getAsFile();
    }
  }
  return null;
}
