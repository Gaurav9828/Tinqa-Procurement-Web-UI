import { describe, it, expect } from 'vitest';
import { buildApprovedUpdatePayload, getApprovalPermissions, getApprovalState, snapshotFromRequest } from './productApproval';
import type { ProductApprovalResponse } from '../types/productApproval.types';
import { chunkIds } from '../api/productApprovalApi';

const latest = (status: ProductApprovalResponse['status']) => ({ status }) as ProductApprovalResponse;

describe('product approval state', () => {
  it('follows the latest request when there is one', () => {
    for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const) {
      expect(getApprovalState({ enabled: false }, latest(status), true)).toBe(status);
    }
  });

  it('treats active products without a request as pre-existing, and inactive ones as not submitted', () => {
    expect(getApprovalState({ enabled: true }, undefined, true)).toBe('LEGACY');
    expect(getApprovalState({ enabled: false }, undefined, true)).toBe('NOT_SUBMITTED');
  });

  it('is UNKNOWN for inactive products while approvals are not loaded', () => {
    expect(getApprovalState({ enabled: false }, undefined, false)).toBe('UNKNOWN');
    expect(getApprovalState({ enabled: true }, undefined, false)).toBe('LEGACY');
  });

  it('maps UPDATE requests to update states', () => {
    const update = (status: ProductApprovalResponse['status'], appliedAt: string | null = null) =>
      ({ status, requestType: 'UPDATE', appliedAt }) as ProductApprovalResponse;
    expect(getApprovalState({ enabled: true }, update('PENDING'), true)).toBe('UPDATE_PENDING');
    expect(getApprovalState({ enabled: true }, update('REJECTED'), true)).toBe('UPDATE_REJECTED');
    expect(getApprovalState({ enabled: true }, update('APPROVED'), true)).toBe('UPDATE_NOT_APPLIED');
    expect(getApprovalState({ enabled: true }, update('APPROVED', '2026-10-13T10:00:00Z'), true)).toBe('APPROVED');
  });
});

describe('what each state allows', () => {
  it.each([
    ['LEGACY', { canEdit: true, editNeedsApproval: true, canSubmit: false, canActivate: true, canAddStock: true }],
    ['APPROVED', { canEdit: true, editNeedsApproval: true, canSubmit: false, canActivate: true, canAddStock: true }],
    ['PENDING', { canEdit: false, editNeedsApproval: false, canSubmit: false, canActivate: false, canAddStock: false }],
    ['REJECTED', { canEdit: true, editNeedsApproval: false, canSubmit: true, canActivate: false, canAddStock: false }],
    ['CANCELLED', { canEdit: false, editNeedsApproval: false, canSubmit: false, canActivate: false, canAddStock: false }],
    ['NOT_SUBMITTED', { canEdit: true, editNeedsApproval: false, canSubmit: true, canActivate: false, canAddStock: false }],
    ['UPDATE_PENDING', { canEdit: false, editNeedsApproval: true, canSubmit: false, canActivate: true, canAddStock: true }],
    ['UPDATE_REJECTED', { canEdit: true, editNeedsApproval: true, canSubmit: false, canActivate: true, canAddStock: true }],
    ['UPDATE_NOT_APPLIED', { canEdit: false, editNeedsApproval: true, canApplyUpdate: true, canActivate: true, canAddStock: true }],
    ['UNKNOWN', { canEdit: false, editNeedsApproval: false, canSubmit: false, canActivate: false, canAddStock: false }],
  ] as const)('%s', (state, expected) => {
    expect(getApprovalPermissions(state)).toMatchObject(expected);
  });

  it('explains why editing is blocked', () => {
    expect(getApprovalPermissions('PENDING').editBlockedReason).toMatch(/Waiting for Admin L2 approval/);
    expect(getApprovalPermissions('CANCELLED').editBlockedReason).toMatch(/no longer be edited/);
    expect(getApprovalPermissions('REJECTED').editBlockedReason).toBeNull();
  });
});

describe('snapshot', () => {
  it('copies what the reviewer needs from the create request', () => {
    const snapshot = snapshotFromRequest({
      title: 'Touch Panel',
      price: 2999,
      enabled: false,
      stockQuantity: 1,
      image1Url: 'https://cdn.tinqa.com/p.png',
      specifications: [{ specKey: 'Size', specValue: '7 in' }],
      components: [{ itemId: 7, itemName: 'Motherboard', quantity: 2, warranties: [] }],
      warranties: [{ warrantyType: 'MANUFACTURER', title: 'Motherboard', durationValue: 1, durationUnit: 'YEARS', isActive: true }],
    });
    expect(snapshot).toEqual({
      title: 'Touch Panel',
      tagline: null,
      price: 2999,
      discountPercentage: null,
      stockQuantity: 1,
      image1Url: 'https://cdn.tinqa.com/p.png',
      components: [{ itemId: 7, itemName: 'Motherboard', quantity: 2 }],
      warranties: [{ title: 'Motherboard', warrantyType: 'MANUFACTURER', durationValue: 1, durationUnit: 'YEARS', isActive: true }],
      specificationCount: 1,
    });
  });
});


describe('chunkIds (query values stay under the backend 500-character limit)', () => {
  it('keeps short lists in one batch and splits long ones', () => {
    expect(chunkIds([1, 2, 3], 450)).toEqual(['1,2,3']);
    const ids = Array.from({ length: 300 }, (_, i) => 10000 + i); // 300 × 6 chars ≈ 1800 characters
    const batches = chunkIds(ids, 450);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((b) => b.length <= 450)).toBe(true);
    expect(batches.join(',').split(',').map(Number)).toEqual(ids);
    expect(chunkIds([], 450)).toEqual([]);
  });
});

describe('buildApprovedUpdatePayload', () => {
  const previousSnapshot = { stockQuantity: 10 } as ProductApprovalResponse['snapshot'];

  it('keeps the live stock when the update did not change stock', () => {
    const payload = buildApprovedUpdatePayload({ proposedChanges: { title: 'New', stockQuantity: 10 }, previousSnapshot }, { stockQuantity: 7 });
    expect(payload).toMatchObject({ title: 'New', stockQuantity: 7 });
  });

  it('uses the requested stock when the update changed it', () => {
    const payload = buildApprovedUpdatePayload({ proposedChanges: { stockQuantity: 25 }, previousSnapshot }, { stockQuantity: 7 });
    expect(payload.stockQuantity).toBe(25);
  });

  it('fails without stored changes', () => {
    expect(() => buildApprovedUpdatePayload({ proposedChanges: null, previousSnapshot }, { stockQuantity: 7 })).toThrow();
  });
});
