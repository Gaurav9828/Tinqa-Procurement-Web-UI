import { describe, expect, it } from 'vitest';
import {
  IMAGE_DESCRIPTION_MAX,
  IMAGE_SLOTS,
  describedImages,
  dropImageErrors,
  imageBaseOf,
  imageChanges,
  imageCandidates,
  imageName,
  imageStem,
  imagesComplete,
  isLegacyImage,
  resolveImages,
  toImageEntries,
  toImageFields,
  validateImages,
  type ImageEntry,
} from './productImages';

const FRONT = 'https://cdn.tinqa.com/front.png';
const SIDE = 'https://cdn.tinqa.com/side.png';

const entries = (...filled: [number, string, string][]): ImageEntry[] => {
  const all = toImageEntries(null);
  filled.forEach(([slot, url, description]) => (all[slot - 1] = { url, description }));
  return all;
};

describe('product images', () => {
  it('has the same five views, in the order the Ecommerce BE and the storefront use', () => {
    expect(IMAGE_SLOTS.map((slot) => slot.view)).toEqual(['Front view', 'Side view', 'Back view', 'Close-up detail', 'In use']);
    expect(IMAGE_SLOTS.map((slot) => slot.urlField)).toEqual(['image1Url', 'image2Url', 'image3Url', 'image4Url', 'image5Url']);
  });

  it('keeps every image in its own slot, sending its description with it', () => {
    const form = toImageEntries({ image1Url: FRONT, image1Description: 'Front', image3Url: SIDE, image3Description: null });
    expect(form).toHaveLength(5);
    expect(form[1]).toEqual({ url: '', description: '' });
    expect(form[2]).toEqual({ url: SIDE, description: '' });

    expect(toImageFields(entries([1, ` ${FRONT} `, ' The front. '], [3, SIDE, '']))).toEqual({
      image1Url: FRONT,
      image1Description: 'The front.',
      image3Url: SIDE,
      image3Description: '',
    });
    // An empty slot sends nothing, so its description goes with it
    expect(toImageFields(entries([2, '', 'Left behind']))).toEqual({});
  });

  it('needs image 1 and a description for every image, except on a draft', () => {
    expect(validateImages(entries())).toEqual({ image1Url: 'Image 1 (front view) is required.' });
    expect(validateImages(entries([1, FRONT, 'The front.'], [2, SIDE, '  ']))).toEqual({
      image2Description: 'Image 2 (side view) needs a description: say what this picture shows of the product.',
    });
    expect(validateImages(entries([2, SIDE, '']), { draft: true })).toEqual({});
    expect(validateImages(entries([1, FRONT, 'x'.repeat(IMAGE_DESCRIPTION_MAX + 1)]), { draft: true })).toEqual({
      image1Description: `Image 1 (front view) description can be at most ${IMAGE_DESCRIPTION_MAX} characters.`,
    });
    expect(imagesComplete(entries([1, FRONT, 'The front.']))).toBe(true);
  });

  it('lets an image saved before descriptions existed keep having none until it is replaced', () => {
    const saved = { image1Url: FRONT, image1Description: null, image2Url: SIDE, image2Description: 'Side.' };
    expect(validateImages(entries([1, FRONT, ''], [2, SIDE, 'Side.']), { saved })).toEqual({});
    // A replaced image needs one, and a described image can't lose it
    const errors = validateImages(entries([1, 'https://cdn.tinqa.com/new.png', ''], [2, SIDE, '']), { saved });
    expect(Object.keys(errors)).toEqual(['image1Description', 'image2Description']);
  });

  it('lists what an edit changes for the approver', () => {
    const saved = { image1Url: FRONT, image1Description: 'Old front.', image2Url: SIDE, image2Description: 'Side.' };
    expect(imageChanges(saved, entries([1, FRONT, 'New front.']))).toEqual([
      { label: 'Image 1 (front view) description', oldVal: 'Old front.', newVal: 'New front.' },
      { label: 'Image 2 (side view) URL', oldVal: SIDE, newVal: 'None' },
      { label: 'Image 2 (side view) description', oldVal: 'Side.', newVal: 'None' },
    ]);
    expect(imageChanges(saved, entries([1, FRONT, 'Old front.'], [2, SIDE, 'Side.']))).toEqual([]);
  });

  it('shows the filled images with their views, and drops image errors once they change', () => {
    expect(describedImages({ image2Url: SIDE, image2Description: 'Side.' })).toEqual([
      { index: 1, view: 'Side view', url: SIDE, description: 'Side.' },
    ]);
    expect(dropImageErrors({ image1Url: 'x', image4Description: 'y', title: 'z' })).toEqual({ title: 'z' });
  });

  describe('image names', () => {
    const BASE = 'http://localhost:3000/public/products';
    const naming = { base: BASE, title: 'RudraX', versionNumber: 1 };

    it('makes each name from the product name, its version and the slot', () => {
      expect(imageStem('RudraX')).toBe('rudrax');
      // No spaces or symbols: the letters and digits run on
      expect(imageStem(' Rudra X -- 200! ')).toBe('rudrax200');
      expect(imageStem('Tail-X_v2 (Pro)')).toBe('tailxv2pro');
      expect(imageName({ title: 'Rudra X', versionNumber: 1 }, 0)).toBe('rudrax_v0.1_1');
      expect(imageName({ title: '-- !', versionNumber: 1 }, 0)).toBeNull();
      expect(imageName(naming, 0)).toBe('rudrax_v0.1_1');
      expect(imageName({ title: 'RudraX', versionNumber: 12 }, 4)).toBe('rudrax_v1.2_5');
      expect(imageName({ title: '  ', versionNumber: 1 }, 0)).toBeNull();
    });

    it('looks for each image under its name with every file type, the one it was saved with first', () => {
      expect(imageCandidates(naming, 0)).toEqual(['png', 'jpg', 'jpeg', 'webp'].map((type) => `${BASE}/rudrax_v0.1_1.${type}`));
      expect(imageCandidates({ ...naming, base: `${BASE}//`, title: 'Rudra X', versionNumber: 2 }, 2, `${BASE}/rudrax_v0.1_3.webp`)[0]).toBe(
        `${BASE}/rudrax_v0.2_3.webp`
      );
      // Nothing to look for without a name or a folder
      expect(imageCandidates({ ...naming, title: ' ' }, 0)).toEqual([]);
      expect(imageCandidates({ ...naming, base: '' }, 0)).toEqual([]);
    });

    it('holds the images found in the folder, and keeps one saved before names were made until its file is there', () => {
      const saved = { image1Url: `${BASE}/rudrax_v0.1_1.webp`, image1Description: 'Front.', image2Url: FRONT, image3Url: `${BASE}/rudrax_v0.1_3.png` };
      const entries = toImageEntries(saved);
      expect(imageBaseOf(saved)).toBe(BASE);
      const found = { state: 'found', url: `${BASE}/rudrax_v0.1_1.webp` } as const;
      const missing = { state: 'missing' } as const;
      const resolved = resolveImages(entries, [found, missing, missing, { state: 'found', url: `${BASE}/rudrax_v0.1_4.jpg` }, missing]);
      expect(resolved.map((entry) => entry.url)).toEqual([`${BASE}/rudrax_v0.1_1.webp`, FRONT, '', `${BASE}/rudrax_v0.1_4.jpg`, '']);
      expect(isLegacyImage(FRONT, 1)).toBe(true);
      // A standard name in another slot's place isn't this slot's
      expect(isLegacyImage(`${BASE}/rudrax_v0.1_1.png`, 1)).toBe(true);
      // Its standard file found: it replaces the one from before
      expect(resolveImages(entries, [found, { state: 'found', url: `${BASE}/rudrax_v0.1_2.png` }, missing, missing, missing])[1].url).toBe(
        `${BASE}/rudrax_v0.1_2.png`
      );
      // Still looking: the saved ones stay, and nothing changes for the approver
      const checking = Array(5).fill({ state: 'checking' });
      expect(imageChanges(saved, resolveImages(entries, checking))).toEqual([]);
    });
  });
});
