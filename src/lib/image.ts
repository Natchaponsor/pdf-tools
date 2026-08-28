import imageCompression from 'browser-image-compression';

export type ImageQuality = 'high' | 'medium' | 'low';

const PRESETS: Record<ImageQuality, { initialQuality: number; maxWidthOrHeight: number }> = {
  high: { initialQuality: 0.82, maxWidthOrHeight: 3000 },
  medium: { initialQuality: 0.7, maxWidthOrHeight: 2200 },
  low: { initialQuality: 0.55, maxWidthOrHeight: 1600 },
};

export interface CompressImageResult {
  blob: Blob;
  outputBytes: number;
  outputType: string;
}

/**
 * Shrink a raster image. `useWebWorker` is deliberately OFF: with it on the
 * library fetches its worker code from a CDN, which would break the
 * "nothing leaves your device" guarantee.
 */
export async function compressImage(
  file: File,
  quality: ImageQuality,
): Promise<CompressImageResult> {
  const preset = PRESETS[quality];
  const compressed = await imageCompression(file, {
    ...preset,
    useWebWorker: false,
    alwaysKeepResolution: false,
  });
  return {
    blob: compressed,
    outputBytes: compressed.size,
    outputType: compressed.type || file.type,
  };
}
