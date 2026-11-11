/** Rows per page of the Warranty claims list. */
export const WARRANTY_CLAIMS_PAGE_SIZE = 20;

export const warrantyClaimPath = (referenceNumber: string) => `/warranty-claims/${encodeURIComponent(referenceNumber)}`;
