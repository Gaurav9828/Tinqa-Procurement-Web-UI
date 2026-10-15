import { useEffect, useState } from 'react';
import axios from 'axios';
import { accessService } from '../api/services/accessService';
import type { AccessCatalog } from '../config/access';
import { getApiErrorMessages } from '../utils/apiError';

/**
 * The server's access catalog (designations, groups, permissions), loaded once per page load and shared.
 * `error` is a user-facing message when it couldn't be loaded.
 */
export const useAccessCatalog = () => {
  const [catalog, setCatalog] = useState<AccessCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    accessService
      .getCatalog()
      .then((result) => {
        if (!cancelled) {
          setCatalog(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError(getApiErrorMessages(err, 'Could not load designations.')[0]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { catalog, error, isLoading: !catalog && !error, retry: () => setAttempt((n) => n + 1) };
};
