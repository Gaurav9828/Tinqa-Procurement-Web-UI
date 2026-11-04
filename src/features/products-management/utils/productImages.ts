// Product images: every product shows the same view in the same slot (image 1 is always the front, …), so products
// look alike side by side and Aura walks through them the same way, reading out what each image shows. Mirrors the
// Ecommerce BE ProductImages (views and rules) and the storefront services/productImages.ts; change them together.

import type { CreateProductRequest, ProductResponse } from '../types/product.types';
import { formatVersion } from './productVersion';

/** Ecommerce BE limit (ProductSecurityValidator, column image{n}_description). */
export const IMAGE_DESCRIPTION_MAX = 400;

export type ImageUrlField = 'image1Url' | 'image2Url' | 'image3Url' | 'image4Url' | 'image5Url';
export type ImageDescriptionField =
  | 'image1Description'
  | 'image2Description'
  | 'image3Description'
  | 'image4Description'
  | 'image5Description';

export interface ImageSlot {
  urlField: ImageUrlField;
  descriptionField: ImageDescriptionField;
  /** The view this slot holds on every product. */
  view: string;
  /** What to photograph, for whoever adds the image. */
  shoot: string;
  /** An example description, as a placeholder. */
  example: string;
}

export const IMAGE_SLOTS: readonly ImageSlot[] = [
  {
    urlField: 'image1Url',
    descriptionField: 'image1Description',
    view: 'Front view',
    shoot: 'The product straight on from the front, on a plain background.',
    example: 'What the front shows: its shape, colour and main features.',
  },
  {
    urlField: 'image2Url',
    descriptionField: 'image2Description',
    view: 'Side view',
    shoot: 'Turned to one side, to show its depth and shape.',
    example: 'What the side shows: how deep it is and its profile.',
  },
  {
    urlField: 'image3Url',
    descriptionField: 'image3Description',
    view: 'Back view',
    shoot: 'The back: fittings, ports, signature or base.',
    example: 'What the back shows: fittings, ports, signature or base.',
  },
  {
    urlField: 'image4Url',
    descriptionField: 'image4Description',
    view: 'Close-up detail',
    shoot: 'A close-up of the finish, material or craftsmanship.',
    example: 'What the close-up shows: the material, finish and handwork.',
  },
  {
    urlField: 'image5Url',
    descriptionField: 'image5Description',
    view: 'In use',
    shoot: 'In use or in a room, so its size is clear.',
    example: 'Where it is used, and how big it is next to things around it.',
  },
];

/**
 * Image names: every image is named from the product name and its version, then its slot, e.g. image 1 of RudraX
 * v0.1 is `rudrax_v0.1_1.png`. Only the folder address is typed; each slot's image is looked for in it under its name
 * (useFoundImages) and taken when found, so the files are named to match. The Ecommerce BE
 * (ProductImages.requireNames) refuses a new or changed image named otherwise.
 */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

/** Where images are kept, until the user types another (remembered on this browser). */
export const DEFAULT_IMAGE_BASE: string = import.meta.env.VITE_PRODUCT_IMAGE_BASE_URL || 'http://localhost:3000/public/products';
const IMAGE_BASE_KEY = 'tinqa.productImageBase';

export const rememberedImageBase = (): string => {
  try {
    return localStorage.getItem(IMAGE_BASE_KEY) || DEFAULT_IMAGE_BASE;
  } catch {
    return DEFAULT_IMAGE_BASE;
  }
};

export const rememberImageBase = (base: string) => {
  try {
    localStorage.setItem(IMAGE_BASE_KEY, base);
  } catch {
    // Storage off: the default is used next time
  }
};

/**
 * The product name as it starts an image name: lower case letters and digits only, every space and symbol left out
 * ("RudraX" and "Rudra X" → "rudrax", "Tail-X 200!" → "tailx200").
 */
export const imageStem = (title: string): string => title.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '');

/** What an image's name is made from: the folder address, the product name and the version it has or gets. */
export interface ImageNaming {
  base: string;
  title: string;
  versionNumber: number;
}

/** "rudrax_v0.1_1" for image 1 (index 0); null without a product name. */
export const imageName = (naming: Pick<ImageNaming, 'title' | 'versionNumber'>, index: number): string | null => {
  const stem = imageStem(naming.title);
  return stem ? `${stem}_${formatVersion(naming.versionNumber)}_${index + 1}` : null;
};

/** The full address of an image, or null until the folder address and the product name are given. */
export const imageAddress = (naming: ImageNaming, index: number, extension: ImageExtension): string | null => {
  let base = naming.base.trim();
  while (base.endsWith('/')) base = base.slice(0, -1);
  const name = imageName(naming, index);
  return base && name ? `${base}/${name}.${extension}` : null;
};

const NAMED = /^(.+)\/[^/]+_v\d+\.\d_([1-5])\.(png|jpg|jpeg|webp)$/;

/** The folder and file type of an address already named the standard way for this slot; null for any other. */
const parseImageAddress = (url: string, index: number): { base: string; extension: ImageExtension } | null => {
  const match = NAMED.exec(url.trim());
  return match && Number(match[2]) === index + 1 ? { base: match[1], extension: match[3] as ImageExtension } : null;
};

/**
 * The addresses image `index` may be found at, one per file type: the type it was saved with first, then .png, .jpg,
 * .jpeg, .webp. Empty until the folder address and the product name are given.
 */
export const imageCandidates = (naming: ImageNaming, index: number, savedUrl = ''): string[] => {
  const saved = parseImageAddress(savedUrl, index)?.extension;
  const extensions = saved ? [saved, ...IMAGE_EXTENSIONS.filter((extension) => extension !== saved)] : [...IMAGE_EXTENSIONS];
  return extensions.map((extension) => imageAddress(naming, index, extension)).filter((url): url is string => url !== null);
};

/** Whether a slot's image was found in the folder under its name. */
export type ImageLookup =
  /** No name yet: the product name or the folder address is missing. */
  | { state: 'unnamed' }
  | { state: 'checking' }
  | { state: 'found'; url: string }
  | { state: 'missing' };

/** One slot's form values. */
export interface ImageEntry {
  /** The image's address: as saved in the form state, and as sent once resolved (see resolveImages). */
  url: string;
  description: string;
}

type ImageFields = Pick<ProductResponse, ImageUrlField | ImageDescriptionField>;

/** The form's five slots, filled from a saved product (or empty). */
export const toImageEntries = (product: Partial<ImageFields> | null | undefined): ImageEntry[] =>
  IMAGE_SLOTS.map((slot) => ({ url: product?.[slot.urlField] ?? '', description: product?.[slot.descriptionField] ?? '' }));

/** The folder a saved product's images are in, else the one last used. */
export const imageBaseOf = (product: Partial<ImageFields> | null | undefined): string => {
  const saved = IMAGE_SLOTS.map((slot, index) => parseImageAddress(product?.[slot.urlField] ?? '', index)).find(Boolean);
  return saved?.base ?? rememberedImageBase();
};

/** An image saved before names were made automatically (not named the standard way for its slot). */
export const isLegacyImage = (url: string, index: number): boolean => url.trim() !== '' && parseImageAddress(url, index) === null;

/**
 * The images the form holds: each slot's image found in the folder; else, while it is still being looked for, the
 * one saved; else an image saved before names were made automatically, kept until its standard file is there.
 */
export const resolveImages = (entries: readonly ImageEntry[], lookups: readonly ImageLookup[]): ImageEntry[] =>
  entries.map((entry, index) => {
    const lookup = lookups[index];
    if (lookup?.state === 'found') return { ...entry, url: lookup.url };
    if (lookup?.state === 'checking') return entry;
    return isLegacyImage(entry.url, index) ? entry : { ...entry, url: '' };
  });

/**
 * The request's image fields. An empty slot sends nothing (its description goes with it); a filled one sends its
 * description, '' included, which clears a saved one on update.
 */
export const toImageFields = (entries: readonly ImageEntry[]): Pick<CreateProductRequest, ImageUrlField | ImageDescriptionField> => {
  const fields: Pick<CreateProductRequest, ImageUrlField | ImageDescriptionField> = {};
  IMAGE_SLOTS.forEach((slot, i) => {
    const url = entries[i]?.url.trim() ?? '';
    if (!url) return;
    fields[slot.urlField] = url;
    fields[slot.descriptionField] = entries[i].description.trim();
  });
  return fields;
};

/**
 * Field errors, keyed like the backend's. `draft`: nothing is required yet. `saved`: the product being edited, whose
 * images saved before descriptions existed may keep having none while they stay the same.
 */
export const validateImages = (
  entries: readonly ImageEntry[],
  { draft = false, saved = null }: { draft?: boolean; saved?: Partial<ImageFields> | null } = {}
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!draft && !entries[0]?.url.trim()) {
    errors.image1Url = 'Image 1 (front view) is required.';
  }
  IMAGE_SLOTS.forEach((slot, i) => {
    const url = entries[i]?.url.trim() ?? '';
    const description = entries[i]?.description.trim() ?? '';
    const label = `Image ${i + 1} (${slot.view.toLowerCase()})`;
    if (!url) return;
    if (description.length > IMAGE_DESCRIPTION_MAX) {
      errors[slot.descriptionField] = `${label} description can be at most ${IMAGE_DESCRIPTION_MAX} characters.`;
      return;
    }
    const legacy = !!saved && url === (saved[slot.urlField] ?? '') && !saved[slot.descriptionField];
    if (!draft && !legacy && !description) {
      errors[slot.descriptionField] = `${label} needs a description: say what this picture shows of the product.`;
    }
  });
  return errors;
};

/** Errors without the image fields' (`image1Url`, `image2Description`, …), once the images are changed. */
export const dropImageErrors = (errors: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => !/^image\d/.test(key)));

/** Whether every slot needed for submitting is filled in. */
export const imagesComplete = (entries: readonly ImageEntry[], saved?: Partial<ImageFields> | null): boolean =>
  Object.keys(validateImages(entries, { saved })).length === 0;

/** The filled slots with their view, for previews (index = slot, 0-based). */
export const describedImages = (product: Partial<ImageFields> | null | undefined) =>
  IMAGE_SLOTS.map((slot, index) => ({
    index,
    view: slot.view,
    url: product?.[slot.urlField] ?? null,
    description: product?.[slot.descriptionField] ?? null,
  })).filter((image): image is typeof image & { url: string } => !!image.url);

/** What an edit changes in the images, for the approver ("Image 2 (side view) URL", "… description"). */
export const imageChanges = (
  saved: Partial<ImageFields>,
  entries: readonly ImageEntry[]
): { label: string; oldVal: string; newVal: string }[] =>
  IMAGE_SLOTS.flatMap((slot, i) => {
    const label = `Image ${i + 1} (${slot.view.toLowerCase()})`;
    const oldUrl = saved[slot.urlField] ?? '';
    const newUrl = entries[i]?.url.trim() ?? '';
    const oldDescription = saved[slot.descriptionField] ?? '';
    // A removed image takes its description with it
    const newDescription = newUrl ? (entries[i]?.description.trim() ?? '') : '';
    return [
      ...(oldUrl.trim() !== newUrl ? [{ label: `${label} URL`, oldVal: oldUrl || 'None', newVal: newUrl || 'None' }] : []),
      ...(oldDescription.trim() !== newDescription
        ? [{ label: `${label} description`, oldVal: oldDescription || 'None', newVal: newDescription || 'None' }]
        : []),
    ];
  });
