import type { OrderItemUnits, UnitSerial } from '../types/orderTracking.types';

/** Ecommerce ProductUnitBarcodes: 8 to 32 capital letters, digits or hyphens (compared upper-cased, trimmed). */
export const SERIAL_PATTERN = /^[A-Z0-9-]{8,32}$/;

/** One input per unit: "<orderItemId>:<n>" (n counts from 0). */
export interface SerialSlot {
  key: string;
  orderItemId: number;
  title: string;
  /** 1-based position of the unit on its line, for the label. */
  position: number;
  quantity: number;
}

/** The lines that still need serials: no unit recorded yet (a line is recorded all at once). */
export const linesNeedingSerials = (lines: OrderItemUnits[] | null | undefined): OrderItemUnits[] =>
  (lines ?? []).filter((line) => line.quantity > 0 && line.units.length === 0);

export const serialSlots = (lines: OrderItemUnits[]): SerialSlot[] =>
  lines.flatMap((line) =>
    Array.from({ length: line.quantity }, (_, n) => ({
      key: `${line.orderItemId}:${n}`,
      orderItemId: line.orderItemId,
      title: line.title,
      position: n + 1,
      quantity: line.quantity,
    }))
  );

export const normaliseSerial = (value: string): string => value.trim().toUpperCase();

/**
 * Checks the typed serials before they are sent: every unit has one, each looks like a unit barcode, none twice.
 * Returns the request body, or the first problem per slot (keyed like the slots).
 */
export const collectSerials = (
  slots: SerialSlot[],
  values: Record<string, string>
): { serials: UnitSerial[]; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  const serials: UnitSerial[] = [];
  for (const slot of slots) {
    const serial = normaliseSerial(values[slot.key] ?? '');
    if (!serial) {
      errors[slot.key] = 'Scan or type this unit\'s serial.';
    } else if (!SERIAL_PATTERN.test(serial)) {
      errors[slot.key] = 'A serial is 8 to 32 letters, digits or hyphens.';
    } else if (seen.has(serial)) {
      errors[slot.key] = 'This serial is already entered above.';
    } else {
      seen.set(serial, slot.key);
      serials.push({ orderItemId: slot.orderItemId, serial });
    }
  }
  return { serials, errors };
};

/**
 * Statuses whose serials may still be recorded afterwards (mirrors Ecommerce OrderItemUnitService.RECORDABLE): the
 * customer has, or is about to get, the units. For orders that shipped before serials were recorded.
 */
export const SERIALS_RECORDABLE: ReadonlySet<string> = new Set([
  'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS',
  'DELIVERY_REATTEMPT', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_CANCELLED',
  'RETURN_INSPECTION_FAILED', 'RETURN_BACK_IN_TRANSIT', 'RETURN_BACK_DELIVERED',
]);
