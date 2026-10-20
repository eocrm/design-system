import type { CropArea } from './extractCropBlob';

export type Size = { width: number; height: number };
export type Handle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function effectiveMin(minSize: number, image: Size): number {
  return Math.min(minSize, image.width, image.height);
}

/** Contain-fit the image into the viewport minus padding (sides/top) and bottomReserve. */
export function fitImage(viewport: Size, image: Size, padding: number, bottomReserve: number) {
  const areaW = viewport.width - 2 * padding;
  const areaH = viewport.height - padding - bottomReserve;
  const scale = Math.min(areaW / image.width, areaH / image.height);
  return {
    scale,
    offsetX: padding + (areaW - image.width * scale) / 2,
    offsetY: padding + (areaH - image.height * scale) / 2,
  };
}

/** Largest box of `ratio` inside the image, scaled to 80%, centered. */
export function defaultCropArea(image: Size, aspectRatio?: number): CropArea {
  const ratio = aspectRatio ?? image.width / image.height;
  const fullW = image.width / image.height > ratio ? image.height * ratio : image.width;
  const width = fullW * 0.8;
  const height = width / ratio;
  return { x: (image.width - width) / 2, y: (image.height - height) / 2, width, height };
}

/** Pull a (possibly out-of-bounds) area into the image: shrink to fit holding the ratio, then clamp position. */
export function normalizeCrop(area: CropArea, image: Size, aspectRatio?: number): CropArea {
  const ratio = aspectRatio ?? area.width / area.height;
  const width = Math.min(area.width, image.width, image.height * ratio);
  const height = width / ratio;
  return moveCrop({ ...area, width, height }, 0, 0, image);
}

export function moveCrop(area: CropArea, dx: number, dy: number, image: Size): CropArea {
  return {
    ...area,
    x: clamp(area.x + dx, 0, image.width - area.width),
    y: clamp(area.y + dy, 0, image.height - area.height),
  };
}

/**
 * Resize from `handle`, opposite edge/corner anchored. Edge handles only act
 * in free mode; with a ratio they return `start` unchanged.
 */
export function resizeCrop(
  start: CropArea,
  handle: Handle,
  dx: number,
  dy: number,
  image: Size,
  minSize: number,
  aspectRatio?: number,
): CropArea {
  const min = effectiveMin(minSize, image);
  const east = handle.includes('e');
  const west = handle.includes('w');
  const north = handle.includes('n');
  const south = handle.includes('s');
  const right = start.x + start.width;
  const bottom = start.y + start.height;

  // Space available from the anchor, per axis.
  const maxW = east ? image.width - start.x : west ? right : start.width;
  const maxH = south ? image.height - start.y : north ? bottom : start.height;

  let width = east ? start.width + dx : west ? start.width - dx : start.width;
  let height = south ? start.height + dy : north ? start.height - dy : start.height;

  if (aspectRatio === undefined) {
    if (east || west) width = clamp(width, min, maxW);
    if (north || south) height = clamp(height, min, maxH);
  } else {
    if (handle.length === 1) return start;
    if (width / height > aspectRatio) width = height * aspectRatio;
    else height = width / aspectRatio;
    width = clamp(width, Math.max(min, min * aspectRatio), Math.min(maxW, maxH * aspectRatio));
    height = width / aspectRatio;
  }

  return {
    x: west ? right - width : start.x,
    y: north ? bottom - height : start.y,
    width,
    height,
  };
}

/** Scale around the center, clamped to image and min size, ratio held. */
export function scaleCrop(
  area: CropArea,
  factor: number,
  image: Size,
  minSize: number,
  aspectRatio?: number,
): CropArea {
  const min = effectiveMin(minSize, image);
  const ratio = aspectRatio ?? area.width / area.height;
  const width = clamp(
    area.width * factor,
    Math.max(min, min * ratio),
    Math.min(image.width, image.height * ratio),
  );
  const height = width / ratio;
  return moveCrop(
    { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height },
    0,
    0,
    image,
  );
}
