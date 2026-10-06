/**
 * Remembers where the admin was in a list (scroll offset + which item they opened) so
 * coming back from a detail page lands on the same spot.
 *
 * Kept in sessionStorage (per tab, survives a reload of the detail page), namespaced per
 * list, and matched against the list URL's query string so it only applies when returning
 * to the exact same list view.
 */
export interface ListPosition {
  search: string;
  scrollY: number;
  itemId: string;
}

const storageKey = (listKey: string) => `tinqa.listPosition.${listKey}`;

export const saveListPosition = (listKey: string, search: string, itemId: string) => {
  try {
    const position: ListPosition = { search, scrollY: window.scrollY, itemId };
    sessionStorage.setItem(storageKey(listKey), JSON.stringify(position));
  } catch {
    // Storage unavailable (private mode, quota): returning just starts at the top.
  }
};

/** The saved position if it belongs to this list view, else null. */
export const peekListPosition = (listKey: string, search: string): ListPosition | null => {
  try {
    const raw = sessionStorage.getItem(storageKey(listKey));
    if (!raw) return null;
    const position = JSON.parse(raw) as ListPosition;
    return position.search === search ? position : null;
  } catch {
    return null;
  }
};

/** Forget the saved position once it has been applied. */
export const clearListPosition = (listKey: string) => {
  try {
    sessionStorage.removeItem(storageKey(listKey));
  } catch {
    // ignore
  }
};
