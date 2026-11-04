import { axiosClient } from '../axiosClient';
import type { AccessCatalog, MyAccess } from '../../config/access';
import type { ApiResponse } from '../../types/common.types';

// The catalog changes with a backend deploy or when an admin edits a custom role (invalidateCatalog), so one copy per
// page load is enough otherwise
let catalogRequest: Promise<AccessCatalog> | null = null;
const catalogListeners = new Set<() => void>();

export const accessService = {
  /** The signed-in user's access as of now (designation and level changes apply immediately). */
  getMyAccess: async (): Promise<MyAccess> => {
    const response = await axiosClient.get<ApiResponse<MyAccess>>('/v1/access/me');
    return response.data.data;
  },

  /** Every designation, permission group and permission. Cached; a failed load is retried next time. */
  getCatalog: (): Promise<AccessCatalog> => {
    if (!catalogRequest) {
      catalogRequest = axiosClient
        .get<ApiResponse<AccessCatalog>>('/v1/access/catalog')
        .then((response) => response.data.data)
        .catch((error: unknown) => {
          catalogRequest = null;
          throw error;
        });
    }
    return catalogRequest;
  },

  /**
   * A custom role was created, changed or removed: forget the cached catalog and tell every mounted
   * useAccessCatalog to load it again (they share one request).
   */
  invalidateCatalog: () => {
    catalogRequest = null;
    catalogListeners.forEach((listener) => listener());
  },

  /** Calls `listener` after invalidateCatalog(); returns the unsubscribe function. */
  onCatalogInvalidated: (listener: () => void): (() => void) => {
    catalogListeners.add(listener);
    return () => {
      catalogListeners.delete(listener);
    };
  },

  /** Test hook: forget the cached catalog. */
  resetCatalogCache: () => {
    catalogRequest = null;
  },
};
