import { axiosClient } from '../axiosClient';
import type { AccessCatalog, MyAccess } from '../../config/access';
import type { ApiResponse } from '../../types/common.types';

// The catalog only changes with a backend deploy, so one copy per page load is enough
let catalogRequest: Promise<AccessCatalog> | null = null;

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

  /** Test hook: forget the cached catalog. */
  resetCatalogCache: () => {
    catalogRequest = null;
  },
};
