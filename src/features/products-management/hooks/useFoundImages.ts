import { useEffect, useMemo, useState } from 'react';
import { probeImage } from '../api/imageProbe';
import { IMAGE_SLOTS, imageCandidates, type ImageEntry, type ImageLookup, type ImageNaming } from '../utils/productImages';

/** Looks only once typing has stopped, so a folder address typed letter by letter isn't looked up at each one. */
export const IMAGE_LOOKUP_DELAY_MS = 500;

/** The first address that loads, trying each file type in turn; null when none does. */
const firstFound = async (candidates: readonly string[]): Promise<string | null> => {
  for (const url of candidates) {
    if (await probeImage(url)) return url;
  }
  return null;
};

/**
 * Looks for each slot's image in the folder under its name (any of the file types), after the folder, the product
 * name or the version changes and whenever the window gets focus again (e.g. back from renaming a file).
 * `saved`: the slots as saved, whose file type is tried first. Nothing is looked for while `enabled` is false.
 */
export const useFoundImages = (naming: ImageNaming, saved: readonly ImageEntry[], enabled = true): ImageLookup[] => {
  const candidates = IMAGE_SLOTS.map((_, index) => imageCandidates(naming, index, saved[index]?.url));
  const key = JSON.stringify(candidates);
  const [result, setResult] = useState<{ key: string; found: (string | null)[] } | null>(null);
  // Bumped when the window gets focus, to look again
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const lookAgain = () => setRound((n) => n + 1);
    window.addEventListener('focus', lookAgain);
    return () => window.removeEventListener('focus', lookAgain);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const lists: string[][] = JSON.parse(key);
    if (lists.every((list) => list.length === 0)) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await Promise.all(lists.map(firstFound));
      if (!cancelled) setResult({ key, found });
    }, IMAGE_LOOKUP_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, round, enabled]);

  return useMemo(
    () =>
      (JSON.parse(key) as string[][]).map((list, index): ImageLookup => {
        if (list.length === 0) return { state: 'unnamed' };
        // Looked up again for another name: wait for it (a look on focus keeps showing the last answer)
        if (result?.key !== key) return { state: 'checking' };
        const url = result.found[index];
        return url ? { state: 'found', url } : { state: 'missing' };
      }),
    [key, result]
  );
};
