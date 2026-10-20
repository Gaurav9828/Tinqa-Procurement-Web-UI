import { APP_NAVIGATION } from '../../../config/permissions.config';

/** A sidebar item's label, so the guide always names menu items exactly as the sidebar does. */
export const menuLabel = (navId: string): string => APP_NAVIGATION.find((item) => item.id === navId)?.label ?? navId;
