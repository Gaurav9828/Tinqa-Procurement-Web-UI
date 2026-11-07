import { useNotify } from '../../../hooks/useNotify';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  Power,
  CheckCircle,
  Edit3,
  UserSearch,
  Eye,
  X,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useSupplierList } from '../hooks/useSupplierList';
import { useSupplierActions } from '../hooks/useSupplierActions';
import { supplierApi } from '../api/supplierApi';

import { HeaderColumnFilter } from '../components/HeaderColumnFilter';
import { SupplierStatusBadge } from '../components/SupplierStatusBadge';
import { SupplierFilterBar } from '../components/SupplierFilterBar';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { SupplierLoginPanel } from '../components/SupplierLoginPanel';
import { useAccess } from '../../../hooks/useAccess';
import { Pager } from '../../../components/ui/Pager';
import { ACTIVE_STATUS_OPTIONS } from '../../../utils/activeStatusFilter';

import type {
  CategoryResponse,
  SupplierResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '../types/supplier.types';

const COLUMN_COUNT = 7;

export const SupplierManagementPage: React.FC = () => {
    const { can } = useAccess();
  const {
    suppliers,
    totalElements,
    totalPages,
    isLoading,
    filters,
    cityOptions,
    updateFilter,
    setPage,
    searchNow,
    refetch,
  } = useSupplierList();

  const {
    isSubmitting,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
  } = useSupplierActions(refetch);

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierResponse | null>(null);
  const [previewSupplier, setPreviewSupplier] = useState<SupplierResponse | null>(null);
  const [targetSupplierStatusToggle, setTargetSupplierStatusToggle] =
    useState<SupplierResponse | null>(null);

  const notify = useNotify();

  // Suppliers are assigned item categories (created under Item Management)
  const loadCategories = useCallback(async () => {
    try {
      const res = await supplierApi.getAllCategories();
      if (res.data) setCategories(res.data);
    } catch (err: unknown) {
      notify.error(err, 'Failed to load categories.');
    }
  }, [notify]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Header filter options cover every supplier (not just the loaded page); the backend applies them.
  const categoryOptions = useMemo(() => categories.map((c) => c.name), [categories]);
  const selectedCategoryNames = useMemo(
    () => categories.filter((c) => filters.categoryIds.includes(c.id)).map((c) => c.name),
    [categories, filters.categoryIds]
  );
  const handleCategoryNamesChange = (names: string[]) =>
    updateFilter('categoryIds', categories.filter((c) => names.includes(c.name)).map((c) => c.id));

  const handleOpenCreateSupplier = () => {
    setSelectedSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (supplier: SupplierResponse) => {
    setSelectedSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSubmit = async (
    data: CreateSupplierRequest | UpdateSupplierRequest
  ) => {
    if (selectedSupplier) {
      return await updateSupplier(selectedSupplier.id, data as UpdateSupplierRequest);
    }
    return await createSupplier(data as CreateSupplierRequest);
  };

  const handleConfirmStatusToggle = async () => {
    if (!targetSupplierStatusToggle) return;
    const ok = await toggleSupplierStatus(targetSupplierStatusToggle);
    if (ok) setTargetSupplierStatusToggle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0071e3]" /> Supplier Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
            Manage authorized suppliers, partner contact details, GSTIN, and categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-gray-500 transition-colors cursor-pointer"
            title="Refresh Network"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-[#0071e3] border border-blue-500/20">
            Total: {totalElements}
          </span>
        </div>
      </div>

      <SupplierFilterBar
        searchQuery={filters.search || ''}
        selectedCategoryIds={filters.categoryIds}
        categories={categories}
        onSearchChange={(search) => updateFilter('search', search)}
        onSearchSubmit={searchNow}
        onCategoryChange={(ids) => updateFilter('categoryIds', ids)}
        onOpenCreateSupplierModal={can('SUPPLIER_CREATE') ? handleOpenCreateSupplier : undefined}
      />

      {/* Supplier Table: stays mounted while loading or empty so the header filters stay open and can be cleared */}
      <div className="apple-card overflow-hidden border border-black/10 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Supplier Details</th>
                <th className="p-4">GSTIN / PAN</th>
                <th className="p-4">
                  <HeaderColumnFilter
                    title="Categories"
                    options={categoryOptions}
                    selectedValues={selectedCategoryNames}
                    onChange={handleCategoryNamesChange}
                  />
                </th>
                <th className="p-4">
                  <HeaderColumnFilter
                    title="City / State"
                    options={cityOptions}
                    selectedValues={filters.cities}
                    onChange={(cities) => updateFilter('cities', cities)}
                  />
                </th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">
                  <HeaderColumnFilter
                    title="Status"
                    options={ACTIVE_STATUS_OPTIONS}
                    selectedValues={filters.statuses}
                    onChange={(statuses) => updateFilter('statuses', statuses)}
                  />
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              aria-busy={isLoading}
              className={`divide-y divide-black/5 dark:divide-white/5 transition-opacity ${isLoading && suppliers.length > 0 ? 'opacity-50' : ''}`}
            >
              {suppliers.length === 0 && (
                <tr>
                  {/* Tall enough for an open header filter dropdown */}
                  <td colSpan={COLUMN_COUNT} className="px-4 py-20 text-center text-gray-500 dark:text-neutral-400">
                    {isLoading ? (
                      <>
                        <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-sm">Loading supplier directory...</p>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <UserSearch className="w-8 h-8 text-gray-400 mx-auto" />
                        <h3 className="text-sm font-semibold text-black dark:text-white">No Suppliers Found</h3>
                        <p className="text-xs">Try adjusting your search criteria or header column filter options.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              {suppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-4 max-w-xs">
                    <div>
                      <span className="font-semibold text-sm text-black dark:text-white block">
                        {supplier.name}
                      </span>
                      {supplier.tradeName && (
                        <span className="text-[11px] text-gray-400 block">
                          Trade: {supplier.tradeName}
                        </span>
                      )}
                      {supplier.street && (
                        <div className="mt-0.5">
                          <Tooltip
                            title={supplier.name}
                            content={`${supplier.street}${supplier.landmark ? `, ${supplier.landmark}` : ''} - ${supplier.pincode}`}
                          >
                            <span className="text-[11px] text-gray-400 truncate max-w-[200px] block cursor-help">
                              {supplier.street}
                            </span>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-mono font-medium text-[#0071e3]">
                    <div>{supplier.gstin || '—'}</div>
                    {supplier.panNumber && (
                      <div className="text-[10px] text-gray-400">PAN: {supplier.panNumber}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {supplier.categories && supplier.categories.length > 0 ? (
                        supplier.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-medium text-gray-700 dark:text-neutral-300"
                          >
                            {cat.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-[11px]">Uncategorized</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-neutral-300 font-medium">
                    {supplier.city || '—'}
                    {supplier.state ? `, ${supplier.state}` : ''}
                  </td>
                  <td className="p-4">
                    <div className="text-black dark:text-white font-medium">
                      {supplier.phoneNumber}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate max-w-[150px]">
                      {supplier.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <SupplierStatusBadge isActive={supplier.isActive} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreviewSupplier(supplier)}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {can('SUPPLIER_UPDATE') && (
                      <button
                        onClick={() => handleOpenEditSupplier(supplier)}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-[#0071e3] transition-colors cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      )}
                      {can('SUPPLIER_TOGGLE_STATUS') && (
                      <button
                        onClick={() => setTargetSupplierStatusToggle(supplier)}
                        className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer ${
                          supplier.isActive
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-emerald-500 hover:text-emerald-600'
                        }`}
                        title={supplier.isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pager page={filters.page} totalPages={totalPages} disabled={isLoading} onPage={setPage} />

      {/* Modals */}
      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSubmit={handleSupplierSubmit}
        supplier={selectedSupplier}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      {/* Preview Supplier Modal */}
      {previewSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
              <h3 className="text-base font-semibold text-black dark:text-white">
                Supplier Details Overview
              </h3>
              <button
                onClick={() => setPreviewSupplier(null)}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-black dark:text-white">
                    {previewSupplier.name}
                  </h4>
                  {previewSupplier.tradeName && (
                    <p className="text-gray-400">Trade: {previewSupplier.tradeName}</p>
                  )}
                </div>
                <SupplierStatusBadge isActive={previewSupplier.isActive} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-neutral-300">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{previewSupplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-neutral-300">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{previewSupplier.phoneNumber}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-gray-600 dark:text-neutral-300 pt-2 border-t border-black/5 dark:border-white/5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p>{previewSupplier.street}</p>
                  {previewSupplier.landmark && <p className="text-gray-400">Landmark: {previewSupplier.landmark}</p>}
                  <p>
                    {previewSupplier.city}
                    {previewSupplier.district && previewSupplier.district !== previewSupplier.city ? `, ${previewSupplier.district}` : ''},{' '}
                    {previewSupplier.state} - {previewSupplier.pincode},{' '}
                    {previewSupplier.country}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                <div>
                  <span className="text-gray-400 block">GSTIN</span>
                  <span className="font-mono font-medium text-[#0071e3]">
                    {previewSupplier.gstin || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">PAN</span>
                  <span className="font-mono font-medium text-black dark:text-white">
                    {previewSupplier.panNumber || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-gray-400 block mb-1">Assigned Categories</span>
                <div className="flex flex-wrap gap-1">
                  {previewSupplier.categories?.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-medium text-gray-700 dark:text-neutral-300"
                    >
                      {c.name} ({c.code})
                    </span>
                  ))}
                </div>
              </div>

              <SupplierLoginPanel key={previewSupplier.id} supplier={previewSupplier} />
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {targetSupplierStatusToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-semibold text-black dark:text-white">
              Confirm Status Change
            </h3>
            <p className="text-xs text-gray-600 dark:text-neutral-300">
              Are you sure you want to{' '}
              <strong className="text-black dark:text-white">
                {targetSupplierStatusToggle.isActive ? 'deactivate' : 'activate'}
              </strong>{' '}
              the supplier <strong>{targetSupplierStatusToggle.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTargetSupplierStatusToggle(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusToggle}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-blue-600 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};