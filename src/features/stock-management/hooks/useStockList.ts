import { useState, useEffect, useCallback, useMemo } from 'react';
import { stockApi } from '../api/stockApi';
import type { StockResponse } from '../types/stock.types';
import type { ApprovalStatus } from '../../../types/common.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

export const useStockList = () => {
  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [search, setSearch] = useState<string>('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalStatus | undefined>();

  const notify = useNotify();

  const beginRequest = useLatestRequest();

  const fetchStocks = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await stockApi.getAllStocks();
      if (!isCurrent()) return;
      if (res.success && res.data) {
        setStocks(res.data);
      } else {
        notify.error(res.message || 'Failed to fetch stock entries.');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Error occurred while loading stocks.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [notify, beginRequest]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const filteredStocks = useMemo(() => {
    const query = search.toLowerCase().trim();
    return stocks.filter((stock) => {
      if (approvalStatusFilter && stock.approvalStatus !== approvalStatusFilter) return false;
      if (!query) return true;
      return [stock.stockIdentityNumber, stock.batchNumber, stock.orderNumber, stock.itemName].some(
        (field) => field?.toLowerCase().includes(query)
      );
    });
  }, [stocks, search, approvalStatusFilter]);

  return {
    stocks: filteredStocks,
    totalElements: filteredStocks.length,
    isLoading,
    search,
    approvalStatusFilter,
    updateSearch: setSearch,
    updateApprovalStatusFilter: setApprovalStatusFilter,
    refetch: fetchStocks,
  };
};
