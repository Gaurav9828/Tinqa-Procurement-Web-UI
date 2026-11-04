import { useCallback, useState } from 'react';
import axios from 'axios';
import { productApi } from '../api/productsApi';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import {
    buildDescriptionSuggestions,
    REFERENCE_SUBJECT_MAX,
    REFERENCE_SUBJECT_MIN,
    type DescriptionContext,
    type DescriptionReference,
    type DescriptionSuggestion,
} from '../utils/descriptionSuggestions';

/** Lookups already made this session, by subject (the backend caches them too): asking again costs no call. */
const referenceCache = new Map<string, DescriptionReference | null>();
const cacheKey = (subject: string) => subject.trim().replace(/\s+/g, ' ').toLowerCase();

/** Test hook: forget the session's lookups. */
export const clearDescriptionReferenceCache = () => referenceCache.clear();

/**
 * Description suggestions on request: one GET /products/description-reference per new subject (never while typing),
 * then three versions built in the browser. Without PRODUCT_VIEW, or when the lookup fails, the versions are built
 * from the product's own fields alone.
 */
export const useDescriptionSuggestions = () => {
    const { can } = useAccess();
    const notify = useNotify();
    const canLookUp = can('PRODUCT_VIEW');
    const [suggestions, setSuggestions] = useState<DescriptionSuggestion[]>([]);
    const [reference, setReference] = useState<DescriptionReference | null>(null);
    const [loading, setLoading] = useState(false);

    const suggest = useCallback(async (subject: string, context: DescriptionContext) => {
        const key = cacheKey(subject);
        let found: DescriptionReference | null = null;
        if (canLookUp && key.length >= REFERENCE_SUBJECT_MIN && key.length <= REFERENCE_SUBJECT_MAX) {
            if (referenceCache.has(key)) {
                found = referenceCache.get(key) ?? null;
            } else {
                setLoading(true);
                try {
                    found = await productApi.getDescriptionReference(subject.trim());
                    referenceCache.set(key, found);
                    if (!found) notify.warning(`No reference found for "${subject.trim()}". The suggestions use the product's own details.`);
                } catch (error) {
                    if (axios.isCancel(error)) return;
                    notify.error(error, 'The reference lookup is unavailable. The suggestions use the product\'s own details.');
                } finally {
                    setLoading(false);
                }
            }
        }
        setReference(found);
        setSuggestions(buildDescriptionSuggestions(context, found));
    }, [canLookUp, notify]);

    const clear = useCallback(() => {
        setSuggestions([]);
        setReference(null);
    }, []);

    return { suggestions, reference, loading, canLookUp, suggest, clear };
};
