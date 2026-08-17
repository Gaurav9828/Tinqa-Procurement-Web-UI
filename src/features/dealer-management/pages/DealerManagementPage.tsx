import React, { useState, useEffect, useMemo } from 'react';
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
  Building,
} from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useDealerList } from '../hooks/useDealerList';
import { useDealerActions } from '../hooks/useDealerActions';
import { dealerApi } from '../api/dealerApi';

import { HeaderColumnFilter } from '../components/HeaderColumnFilter';
import { DealerStatusBadge } from '../components/DealerStatusBadge';
import { DealerFilterBar } from '../components/DealerFilterBar';
import { DealerCategoryFormModal } from '../components/DealerCategoryFormModal';
import { DealerFormModal } from '../components/DealerFormModal';

import type {
  CategoryResponse,
  DealerResponse,
  CreateDealerRequest,
  UpdateDealerRequest,
} from '../types/dealer.types';

export const DealerManagementPage: React.FC = () => {
  const {
    dealers,
    totalElements,
    isLoading,
    error,
    filters,
    updateSearch,
    updateCategoryFilter,
    refetch,
  } = useDealerList();

  const {
    isSubmitting,
    actionError,
    actionSuccess,
    clearMessages,
    createCategory,
    createDealer,
    updateDealer,
    toggleDealerStatus,
  } = useDealerActions(refetch);

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<DealerResponse | null>(null);
  const [previewDealer, setPreviewDealer] = useState<DealerResponse | null>(null);
  const [targetDealerStatusToggle, setTargetDealerStatusToggle] =
    useState<DealerResponse | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const loadCategories = async () => {
    try {
      const res = await dealerApi.getAllCategories();
      if (res.data) setCategories(res.data);
    } catch {
      // Silently handled
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(dealers.map((d) => d.city).filter((c): c is string => Boolean(c)))
    );
  }, [dealers]);

  const categoryOptions = useMemo(() => {
    const catSet = new Set<string>();
    dealers.forEach((dealer) => {
      dealer.categories?.forEach((cat) => {
        if (cat.name) catSet.add(cat.name);
      });
    });
    return Array.from(catSet);
  }, [dealers]);

  const statusOptions = ['Active', 'Inactive'];

  const filteredDealers = useMemo(() => {
    return dealers.filter((dealer) => {
      const dealerCatNames = dealer.categories?.map((c) => c.name) || [];
      const matchesCat =
        selectedCategories.length === 0 ||
        dealerCatNames.some((catName) => selectedCategories.includes(catName));

      const matchesCity =
        selectedCities.length === 0 ||
        (dealer.city ? selectedCities.includes(dealer.city) : false);

      const dealerStatus = dealer.isActive ? 'Active' : 'Inactive';
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(dealerStatus);

      return matchesCat && matchesCity && matchesStatus;
    });
  }, [dealers, selectedCategories, selectedCities, selectedStatuses]);

  const handleCreateCategory = async (data: any) => {
    const success = await createCategory(data);
    if (success) await loadCategories();
    return success;
  };

  const handleOpenCreateDealer = () => {
    clearMessages();
    setSelectedDealer(null);
    setIsDealerModalOpen(true);
  };

  const handleOpenEditDealer = (dealer: DealerResponse) => {
    clearMessages();
    setSelectedDealer(dealer);
    setIsDealerModalOpen(true);
  };

  const handleDealerSubmit = async (
    data: CreateDealerRequest | UpdateDealerRequest
  ) => {
    if (selectedDealer) {
      return await updateDealer(selectedDealer.id, data as UpdateDealerRequest);
    }
    return await createDealer(data as CreateDealerRequest);
  };

  const handleConfirmStatusToggle = async () => {
    if (!targetDealerStatusToggle) return;
    const ok = await toggleDealerStatus(targetDealerStatusToggle);
    if (ok) setTargetDealerStatusToggle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0071e3]" /> Dealer Network
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
            Manage authorized dealers, partner contact details, GSTIN, and categories.
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

      {actionSuccess && (
        <Alert type="success" message={actionSuccess} onClose={clearMessages} />
      )}
      {!isDealerModalOpen && !isCategoryModalOpen && actionError && (
        <Alert type="error" message={actionError} onClose={clearMessages} />
      )}

      <DealerFilterBar
        searchQuery={filters.search || ''}
        selectedCategoryId={filters.categoryId}
        categories={categories}
        onSearchChange={updateSearch}
        onCategoryChange={updateCategoryFilter}
        onOpenCreateDealerModal={handleOpenCreateDealer}
        onOpenCreateCategoryModal={() => setIsCategoryModalOpen(true)}
      />

      {error ? (
        <Alert type="error" message={error} />
      ) : isLoading ? (
        <div className="apple-card p-12 text-center text-gray-500 dark:text-neutral-400">
          <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">Loading dealer directory...</p>
        </div>
      ) : filteredDealers.length === 0 ? (
        <div className="apple-card p-12 text-center space-y-2">
          <UserSearch className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="text-sm font-semibold text-black dark:text-white">No Dealers Found</h3>
          <p className="text-xs text-gray-500">
            Try adjusting your search criteria or header column filter options.
          </p>
        </div>
      ) : (
        <div className="apple-card overflow-hidden border border-black/10 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Dealer Details</th>
                  <th className="p-4">GSTIN / PAN</th>
                  <th className="p-4">
                    <HeaderColumnFilter
                      title="Categories"
                      options={categoryOptions}
                      selectedValues={selectedCategories}
                      onChange={setSelectedCategories}
                    />
                  </th>
                  <th className="p-4">
                    <HeaderColumnFilter
                      title="City / State"
                      options={cityOptions}
                      selectedValues={selectedCities}
                      onChange={setSelectedCities}
                    />
                  </th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">
                    <HeaderColumnFilter
                      title="Status"
                      options={statusOptions}
                      selectedValues={selectedStatuses}
                      onChange={setSelectedStatuses}
                    />
                  </th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredDealers.map((dealer) => (
                  <tr
                    key={dealer.id}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 max-w-xs">
                      <div>
                        <span className="font-semibold text-sm text-black dark:text-white block">
                          {dealer.name}
                        </span>
                        {dealer.tradeName && (
                          <span className="text-[11px] text-gray-400 block">
                            Trade: {dealer.tradeName}
                          </span>
                        )}
                        {dealer.street && (
                          <div className="mt-0.5">
                            <Tooltip
                              title={dealer.name}
                              content={`${dealer.street}${dealer.landmark ? `, ${dealer.landmark}` : ''} - ${dealer.pincode}`}
                            >
                              <span className="text-[11px] text-gray-400 truncate max-w-[200px] block cursor-help">
                                {dealer.street}
                              </span>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium text-[#0071e3]">
                      <div>{dealer.gstin || '—'}</div>
                      {dealer.panNumber && (
                        <div className="text-[10px] text-gray-400">PAN: {dealer.panNumber}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {dealer.categories && dealer.categories.length > 0 ? (
                          dealer.categories.map((cat) => (
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
                      {dealer.city || '—'}
                      {dealer.state ? `, ${dealer.state}` : ''}
                    </td>
                    <td className="p-4">
                      <div className="text-black dark:text-white font-medium">
                        {dealer.phoneNumber}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[150px]">
                        {dealer.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <DealerStatusBadge isActive={dealer.isActive} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewDealer(dealer)}
                          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditDealer(dealer)}
                          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-[#0071e3] transition-colors cursor-pointer"
                          title="Edit Dealer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTargetDealerStatusToggle(dealer)}
                          className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer ${
                            dealer.isActive
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-emerald-500 hover:text-emerald-600'
                          }`}
                          title={dealer.isActive ? 'Deactivate Dealer' : 'Activate Dealer'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <DealerCategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCreateCategory}
        isSubmitting={isSubmitting}
        actionError={actionError}
      />

      <DealerFormModal
        isOpen={isDealerModalOpen}
        onClose={() => setIsDealerModalOpen(false)}
        onSubmit={handleDealerSubmit}
        dealer={selectedDealer}
        categories={categories}
        isSubmitting={isSubmitting}
        actionError={actionError}
      />

      {/* Preview Dealer Modal */}
      {previewDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
              <h3 className="text-base font-semibold text-black dark:text-white">
                Dealer Details Overview
              </h3>
              <button
                onClick={() => setPreviewDealer(null)}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-black dark:text-white">
                    {previewDealer.name}
                  </h4>
                  {previewDealer.tradeName && (
                    <p className="text-gray-400">Trade: {previewDealer.tradeName}</p>
                  )}
                </div>
                <DealerStatusBadge isActive={previewDealer.isActive} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-neutral-300">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{previewDealer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-neutral-300">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{previewDealer.phoneNumber}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-gray-600 dark:text-neutral-300 pt-2 border-t border-black/5 dark:border-white/5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p>{previewDealer.street}</p>
                  {previewDealer.landmark && <p className="text-gray-400">Landmark: {previewDealer.landmark}</p>}
                  <p>
                    {previewDealer.city}, {previewDealer.state} - {previewDealer.pincode},{' '}
                    {previewDealer.country}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                <div>
                  <span className="text-gray-400 block">GSTIN</span>
                  <span className="font-mono font-medium text-[#0071e3]">
                    {previewDealer.gstin || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">PAN</span>
                  <span className="font-mono font-medium text-black dark:text-white">
                    {previewDealer.panNumber || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-gray-400 block mb-1">Assigned Categories</span>
                <div className="flex flex-wrap gap-1">
                  {previewDealer.categories?.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-medium text-gray-700 dark:text-neutral-300"
                    >
                      {c.name} ({c.code})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {targetDealerStatusToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-semibold text-black dark:text-white">
              Confirm Status Change
            </h3>
            <p className="text-xs text-gray-600 dark:text-neutral-300">
              Are you sure you want to{' '}
              <strong className="text-black dark:text-white">
                {targetDealerStatusToggle.isActive ? 'deactivate' : 'activate'}
              </strong>{' '}
              the dealer <strong>{targetDealerStatusToggle.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTargetDealerStatusToggle(null)}
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