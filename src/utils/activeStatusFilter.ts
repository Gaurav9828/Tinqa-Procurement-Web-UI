/** Options of a header "Status" column filter on lists whose rows are active or inactive. */
export const ACTIVE_STATUS_OPTIONS = ['Active', 'Inactive'];

/** Selected statuses → the `isActive` query: both or neither selected means any. */
export const isActiveFromStatuses = (statuses: string[]): boolean | undefined =>
  statuses.length === 1 ? statuses[0] === 'Active' : undefined;
