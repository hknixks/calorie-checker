import { uid } from './items';
import type { Food } from './types';

/**
 * Barcode support without asking for the camera: either the user types the digits
 * under the barcode, or they pick a photo of the pack and we decode it on-device
 * with the browser's BarcodeDetector (an image API — no camera permission).
 *
 * Product data comes from Open Food Facts, which is free, open and needs no key.
 */

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';

export class BarcodeError extends Error {}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function detectorCtor(): BarcodeDetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

export function barcodeDecodingSupported(): boolean {
  return Boolean(detectorCtor());
}

/** Read a barcode out of a still image. Returns null when none is found. */
export async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  const Ctor = detectorCtor();
  if (!Ctor) {
    throw new BarcodeError(
      'This browser cannot read barcodes from an image. Type the number under the barcode instead.',
    );
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new BarcodeError('That file could not be read as an image.');
  }
  try {
    const detector = new Ctor({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'],
    });
    const results = await detector.detect(bitmap);
    return results[0]?.rawValue ?? null;
  } catch {
    throw new BarcodeError('Could not read a barcode from that image.');
  } finally {
    bitmap.close?.();
  }
}

interface OffNutriments {
  'energy-kcal_100g'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Look a barcode up and return it as a Food ready to add to a meal. */
export async function lookupBarcode(rawCode: string): Promise<Food> {
  const code = rawCode.replace(/\D/g, '');
  if (code.length < 6) {
    throw new BarcodeError('That does not look like a barcode — expect 8 to 13 digits.');
  }

  let res: Response;
  try {
    res = await fetch(
      `${OFF_ENDPOINT}/${code}.json?fields=product_name,brands,nutriments,serving_quantity,quantity`,
    );
  } catch {
    throw new BarcodeError('Could not reach Open Food Facts. Check your connection.');
  }

  if (res.status === 404) {
    throw new BarcodeError(
      `No product found for ${code}. Open Food Facts is crowd-sourced, so many Nigerian products are missing — add it as a custom food instead.`,
    );
  }
  if (!res.ok) {
    throw new BarcodeError(`Open Food Facts returned an error (${res.status}).`);
  }

  const payload = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      nutriments?: OffNutriments;
      serving_quantity?: number | string;
    };
  };

  const product = payload.product;
  if (payload.status === 0 || !product) {
    throw new BarcodeError(
      `No product found for ${code}. Add it as a custom food instead.`,
    );
  }

  const n = product.nutriments ?? {};
  // Some entries only carry kilojoules.
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : 0);
  if (!kcal) {
    throw new BarcodeError(
      'That product exists but has no calorie data on Open Food Facts. Add it as a custom food instead.',
    );
  }

  const servingGrams = num(product.serving_quantity);
  const servings = servingGrams
    ? [
        { label: `1 serving (${Math.round(servingGrams)} g)`, grams: Math.round(servingGrams) },
        { label: '100 g', grams: 100 },
      ]
    : [{ label: '100 g', grams: 100 }, { label: '1 pack (250 g)', grams: 250 }];

  const name = product.product_name?.trim() || `Product ${code}`;
  const brand = product.brands?.split(',')[0]?.trim();
  // Plenty of entries repeat the brand in the product name — "Nutella (Nutella)".
  const showBrand =
    brand && !name.toLowerCase().includes(brand.toLowerCase()) ? brand : undefined;

  return {
    id: `barcode-${code}-${uid().slice(0, 6)}`,
    name: showBrand ? `${name} (${showBrand})` : name,
    aliases: [name],
    category: 'packaged',
    per100g: {
      kcal: Math.round(kcal),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
    },
    servings,
    custom: true,
    brand,
    barcode: code,
    note: 'From Open Food Facts, per the label.',
  };
}
