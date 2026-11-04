import { describe, expect, it } from 'vitest';
import {
  accessoryChange,
  emptyAccessoryForm,
  parentCandidates,
  toAccessoryFields,
  toAccessoryForm,
  validateAccessoryForm,
  type AccessoryForm,
} from './accessoryForm';
import { snapshotFromRequest } from './productApproval';
import type { ProductResponse } from '../types/product.types';

const product = (id: number, title: string, extra: Partial<ProductResponse> = {}): ProductResponse => ({
  id,
  title,
  tagline: null,
  description: null,
  price: 1000,
  discountPercentage: null,
  image1Url: null,
  image2Url: null,
  image3Url: null,
  image4Url: null,
  image5Url: null,
  enabled: true,
  stockQuantity: 1,
  lastUpdateDescription: null,
  specifications: [],
  warranties: [],
  components: [],
  averageRating: 0,
  reviewCount: 0,
  accessory: false,
  accessoryPurpose: null,
  accessoryBenefits: [],
  draft: false,
  versionNumber: 1,
  modelName: null,
  previousVersionId: null,
  sold: false,
  accessoryFor: [],
  accessories: [],
  ...extra,
});

const STAND = product(3, 'Stand', {
  accessory: true,
  accessoryPurpose: 'Keeps it level',
  accessoryBenefits: ['Anti-slip'],
  accessoryFor: [{ productId: 1, title: 'Lamp', bundleDiscountPercentage: 5 }],
});

const form = (patch: Partial<AccessoryForm>): AccessoryForm => ({ ...emptyAccessoryForm(), isAccessory: true, ...patch });

describe('accessory form', () => {
  it('offers only other, non-accessory products as parents, by title', () => {
    const list = [product(2, 'Zebra'), STAND, product(1, 'Lamp'), product(9, 'Self')];
    expect(parentCandidates(list, 9).map((p) => p.id)).toEqual([1, 2]);
  });

  it('needs a parent and a 0–90% discount with at most 2 decimals', () => {
    expect(validateAccessoryForm(form({}))).toHaveProperty('accessoryParents');
    const errors = validateAccessoryForm(
      form({
        parents: [
          { productId: 1, title: 'Lamp', discount: '91' },
          { productId: 2, title: 'Frame', discount: '2.555' },
          { productId: 4, title: 'Case', discount: '12.5' },
        ],
      })
    );
    expect(Object.keys(errors)).toEqual(['accessoryParents[0].bundleDiscountPercentage', 'accessoryParents[1].bundleDiscountPercentage']);
    expect(validateAccessoryForm(emptyAccessoryForm())).toEqual({});
  });

  it('sends the parents and the non-blank benefits; off sends just the flag', () => {
    const fields = toAccessoryFields(
      form({ purpose: '  Dust cover ', benefits: ['UV safe', ' '], parents: [{ productId: 1, title: 'Lamp', discount: '2.5' }] })
    );
    expect(fields).toEqual({
      accessory: true,
      accessoryPurpose: 'Dust cover',
      accessoryBenefits: ['UV safe'],
      accessoryParents: [{ parentProductId: 1, bundleDiscountPercentage: 2.5 }],
    });
    expect(toAccessoryFields(emptyAccessoryForm())).toEqual({ accessory: false });
  });

  it('reports a change only when the settings differ', () => {
    const unchanged = toAccessoryForm(STAND);
    expect(accessoryChange(STAND, unchanged)).toBeNull();
    const change = accessoryChange(STAND, { ...unchanged, parents: [{ productId: 1, title: 'Lamp', discount: '10' }] });
    expect(change?.oldVal).toContain('Lamp (+5% off)');
    expect(change?.newVal).toContain('Lamp (+10% off)');
  });

  it('puts the named parents in the approval snapshot, and none when the request leaves them untouched', () => {
    const titleOf = (id: number) => (id === 1 ? 'Lamp' : undefined);
    const snapshot = snapshotFromRequest(
      { title: 'Stand', price: 100, enabled: false, stockQuantity: 1, accessory: true, accessoryParents: [{ parentProductId: 1, bundleDiscountPercentage: 5 }] },
      titleOf
    );
    expect(snapshot.accessoryParents).toEqual([{ productId: 1, title: 'Lamp', bundleDiscountPercentage: 5 }]);
    expect(snapshotFromRequest({ title: 'Stand', price: 100, enabled: false, stockQuantity: 1 })).not.toHaveProperty('accessoryParents');
  });
});
