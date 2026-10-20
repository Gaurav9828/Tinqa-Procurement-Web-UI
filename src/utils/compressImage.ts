/**
 * Shrinks a photo or scan in the browser before it is uploaded: at most `maxEdge` pixels on the long side, re-encoded
 * as JPEG on a white background (2000 px keeps a printed bill readable). The photo's EXIF rotation is applied while
 * decoding, so the result is upright. Only a smaller result is used; anything that can't be decoded here (PDFs, or a
 * browser without createImageBitmap) is returned unchanged and the server still checks it.
 */
export interface CompressedFile {
  file: File;
  originalSize: number;
  compressed: boolean;
}

interface Options {
  maxEdge?: number;
  quality?: number;
  /** Smaller files are already fine and are left alone. */
  minBytes?: number;
}

const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

const withExtension = (name: string, extension: string) => {
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name || 'image'}.${extension}`;
};

export const compressImage = async (
  file: File,
  { maxEdge = 2000, quality = 0.82, minBytes = 300_000 }: Options = {}
): Promise<CompressedFile> => {
  const unchanged = { file, originalSize: file.size, compressed: false };
  if (!COMPRESSIBLE.has(file.type) || file.size < minBytes || typeof createImageBitmap !== 'function') return unchanged;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return unchanged;
    context.fillStyle = '#ffffff'; // transparent areas of a PNG become paper white, not black
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return unchanged;
    return {
      file: new File([blob], withExtension(file.name, 'jpg'), { type: 'image/jpeg', lastModified: file.lastModified }),
      originalSize: file.size,
      compressed: true,
    };
  } catch {
    return unchanged;
  } finally {
    bitmap?.close();
  }
};

/** 1.2 MB / 340 KB / 900 B. */
export const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
