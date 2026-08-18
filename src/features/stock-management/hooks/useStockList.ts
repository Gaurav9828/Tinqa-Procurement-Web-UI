import { useState, useEffect, useCallback, useMemo } from 'react';
import { stockApi } from '../api/stockApi';
import type { StockResponse } from '../types/stock.types';
import type { ApprovalStatus } from '../../../types/common.types';

export const useStockList = () => {
  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ApprovalStatus | undefined>();

  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await stockApi.getAllStocks();
      if (res.success && res.data) {
        setStocks(res.data);
      } else {
        setError(res.message || 'Failed to fetch stock entries.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error occurred while loading stocks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const matchesSearch = search
        ? stock.stockIdentityNumber?.toLowerCase().includes(search.toLowerCase()) ||
          stock.batchNumber?.toLowerCase().includes(search.toLowerCase()) ||
          stock.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
          stock.itemName?.toLowerCase().includes(search.toLowerCase())
        : true;

      const matchesStatus = approvalStatusFilter
        ? stock.approvalStatus === approvalStatusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [stocks, search, approvalStatusFilter]);

  return {
    stocks: filteredStocks,
    totalElements: filteredStocks.length,
    isLoading,
    error,
    search,
    approvalStatusFilter,
    updateSearch: setSearch,
    updateApprovalStatusFilter: setApprovalStatusFilter,
    refetch: fetchStocks,
  };
};