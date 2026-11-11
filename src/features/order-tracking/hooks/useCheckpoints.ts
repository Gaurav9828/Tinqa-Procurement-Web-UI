import { useCallback } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import type { AddCheckpointRequest } from '../types/orderTracking.types';
import { useOrderMutation } from './useOrderMutation';

/**
 * Hub checkpoints. Staff with CUSTOMER_ORDER_TRACKING_UPDATE add through /checkpoints; riders and the Fleet Coordinator
 * (DELIVERY_STATUS_UPDATE only) through /rider-checkpoints — the same rules on the server. Deleting is staff-only.
 * The first checkpoint can move the order to in transit, so the order is reloaded after each change.
 */
export const useCheckpoints = (orderNumber: string, { riderRoute }: { riderRoute: boolean }, onChanged: () => void) => {
  const addCall = useCallback(
    (payload: AddCheckpointRequest) =>
      riderRoute ? orderTrackingApi.addRiderCheckpoint(orderNumber, payload) : orderTrackingApi.addCheckpoint(orderNumber, payload),
    [orderNumber, riderRoute]
  );
  const deleteCall = useCallback((checkpointId: number) => orderTrackingApi.deleteCheckpoint(orderNumber, checkpointId), [orderNumber]);

  const add = useOrderMutation({ call: addCall, success: 'Checkpoint added.', failure: 'The checkpoint could not be added.', onChanged });
  const remove = useOrderMutation({ call: deleteCall, success: 'Checkpoint removed.', failure: 'The checkpoint could not be removed.', onChanged });

  return { addCheckpoint: add.run, deleteCheckpoint: remove.run, isSubmitting: add.isSubmitting || remove.isSubmitting };
};
