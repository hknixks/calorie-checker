export interface PreparedImage {
  /** Full data URL for on-screen preview. */
  previewUrl: string;
  /** Bare base64 (no prefix) for the Gemini request. */
  base64: string;
  mimeType: string;
  /** Small data URL kept with saved meals in history. */
  thumbUrl: string;
}

const MAX_EDGE = 1024;
const THUMB_EDGE = 160;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process the image.');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Resize and re-encode before upload. A 4 MB phone photo becomes a few hundred
 * KB, which keeps the request fast and the free-tier token cost down.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, HEIC or WebP).');
  }
  const img = await loadImage(file);
  const previewUrl = drawScaled(img, MAX_EDGE, 0.85);
  const thumbUrl = drawScaled(img, THUMB_EDGE, 0.6);
  return {
    previewUrl,
    thumbUrl,
    base64: previewUrl.split(',')[1] ?? '',
    mimeType: 'image/jpeg',
  };
}
