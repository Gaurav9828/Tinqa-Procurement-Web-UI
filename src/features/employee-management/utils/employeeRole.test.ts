import { describe, expect, it } from 'vitest';
import type { AccessCatalog } from '../../../config/access';
import {
  creationNeedsApproval,
  employeeRoleLabel,
  isEmployeeRole,
  previewGroups,
  validateDesignation,
} from './employeeRole';

const catalog: AccessCatalog = {
  designations: [
    { code: 'STORE_MANAGER', label: 'Store Manager', department: 'Store Operations', description: 'Ops lead', groups: ['CATALOG_READ', 'CATALOG_APPROVAL'] },
  ],
  groups: [
    { code: 'CATALOG_READ', label: 'Catalog - view', approvalLevel: false },
    { code: 'CATALOG_APPROVAL', label: 'Catalog - approve', approvalLevel: true },
  ],
  permissions: [],
};

describe('employee level helpers', () => {
  it('maps enum values to labels and hides a missing level', () => {
    expect(employeeRoleLabel('ADMIN_L1')).toBe('Level 1 (maker)');
    expect(employeeRoleLabel('ADMIN_L2')).toBe('Level 2 (approver)');
    expect(employeeRoleLabel(undefined)).toBeNull();
    expect(employeeRoleLabel(null)).toBeNull();
  });

  it('accepts only the two admin levels, never labels', () => {
    expect(isEmployeeRole('ADMIN_L2')).toBe(true);
    expect(isEmployeeRole('Level 2 (approver)')).toBe(false);
    expect(isEmployeeRole('DEALER')).toBe(false);
  });
});

describe('validateDesignation', () => {
  it('accepts only catalog codes', () => {
    expect(validateDesignation('STORE_MANAGER', true)).toBeNull();
    expect(validateDesignation('Procurement Manager', true)).toBe('Pick a designation from the list.');
  });

  it('is required on create and optional on edit', () => {
    expect(validateDesignation('', true)).toBe('Designation is required.');
    expect(validateDesignation('', false)).toBeNull();
  });
});

describe('previewGroups', () => {
  it('withholds approval-level groups from Level 1', () => {
    const l1 = previewGroups(catalog, 'STORE_MANAGER', 'ADMIN_L1');
    expect(l1.granted.map((g) => g.code)).toEqual(['CATALOG_READ']);
    expect(l1.withheld.map((g) => g.code)).toEqual(['CATALOG_APPROVAL']);
    expect(previewGroups(catalog, 'STORE_MANAGER', 'ADMIN_L2').granted).toHaveLength(2);
    expect(previewGroups(catalog, 'UNKNOWN', 'ADMIN_L2').granted).toEqual([]);
  });
});

describe('creationNeedsApproval', () => {
  it('mirrors the backend rule', () => {
    expect(creationNeedsApproval(true, 'ADMIN_L1', 'STORE_MANAGER')).toBe(false);
    expect(creationNeedsApproval(false, 'ADMIN_L1', 'STORE_MANAGER')).toBe(true);
    expect(creationNeedsApproval(true, 'ADMIN_L2', 'STORE_MANAGER')).toBe(true);
    expect(creationNeedsApproval(true, 'ADMIN_L1', 'SUPER_ADMIN')).toBe(true);
  });
});
