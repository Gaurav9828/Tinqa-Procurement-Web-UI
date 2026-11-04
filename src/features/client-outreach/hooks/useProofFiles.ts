import { useCallback, useEffect, useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { outreachApi } from '../api/outreachApi';
import type { ContactProof } from '../types/outreach.types';
import { isImageProof } from '../utils/outreach';

/** Opens a proof in a new tab (images and PDFs), fetched through the authenticated client. */
export const useProofOpener = () => {
  const notify = useNotify();
  const [busyId, setBusyId] = useState<number | null>(null);

  const open = useCallback(
    async (contactId: number, proof: ContactProof) => {
      setBusyId(proof.id);
      try {
        const blob = await outreachApi.proofFile(contactId, proof.id);
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      } catch (err: unknown) {
        notify.error(err, 'The proof could not be opened.');
      } finally {
        setBusyId(null);
      }
    },
    [notify]
  );

  return { open, busyId };
};

/**
 * Thumbnails of a contact's image proofs, loaded only once `enabled` (the user asked to see them) and released when
 * the contact leaves the screen. PDFs have no thumbnail.
 */
export const useProofThumbnails = (contactId: number, proofs: ContactProof[], enabled: boolean) => {
  const [urls, setUrls] = useState<Record<number, string>>({});
  const images = proofs.filter((proof) => isImageProof(proof.contentType));
  const key = images.map((proof) => proof.id).join(',');

  useEffect(() => {
    if (!enabled || !key) return;
    let current = true;
    const created: string[] = [];
    const ids = key.split(',').map(Number);
    Promise.all(
      ids.map((id) =>
        outreachApi
          .proofFile(contactId, id)
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            created.push(url);
            return [id, url] as const;
          })
          .catch(() => null)
      )
    ).then((entries) => {
      if (current) setUrls(Object.fromEntries(entries.filter((entry): entry is readonly [number, string] => !!entry)));
    });
    return () => {
      current = false;
      created.forEach((url) => window.URL.revokeObjectURL(url));
    };
  }, [contactId, key, enabled]);

  return urls;
};
