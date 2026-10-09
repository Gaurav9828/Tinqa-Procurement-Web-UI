import React from 'react';
import { Boxes } from 'lucide-react';
import { ItemWarrantiesEditor, type WarrantyEditorChange } from '../../item-management/components/ItemWarrantiesEditor';
import { emptyProductWarranty, type ProductWarrantyFormItem } from '../utils/warrantyForm';

const formatAuditDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Product-level warranties: the shared warranty cards configured for products. */
export const ProductWarrantiesEditor: React.FC<{
  items: ProductWarrantyFormItem[];
  onChange: WarrantyEditorChange<ProductWarrantyFormItem>;
  errors: Record<string, string>;
  disabled?: boolean;
}> = ({ items, onChange, errors, disabled }) => (
  <ItemWarrantiesEditor<ProductWarrantyFormItem>
    items={items}
    onChange={onChange}
    errors={errors}
    disabled={disabled}
    isEdit
    showActiveToggle
    markNew={false}
    newItem={emptyProductWarranty}
    // Saved and item-copied warranties start collapsed so the form stays short; new ones open.
    startCollapsed={(item) => item.id !== undefined || !!item.source}
    // Copies of a selected item's warranties follow the item: shown, sent with the product, not editable here.
    readOnly={(item) => !!item.source}
    readOnlyNote="Copied from the item's warranty — edit it on the item. Remove the item from Components to remove it."
    heading="Warranties"
    description="Overall product warranties. Inactive ones stay saved but are hidden from the store. Warranties of the selected items are added here automatically (read-only)."
    removeDescription={(item) =>
      `"${item.title.trim() || 'This warranty'}" will be permanently deleted when you save the product. To hide it from customers but keep it, turn off "Active" instead.`
    }
    renderBadges={(item) =>
      item.source ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20 shrink-0">
          <Boxes className="w-3 h-3" /> From {item.source.itemName}
        </span>
      ) : null
    }
    renderFooter={(item) =>
      item.updatedAt ? (
        <p className="text-[10px] text-gray-400">
          Last updated {formatAuditDate(item.updatedAt)}
          {item.updatedBy !== null && item.updatedBy !== undefined ? ` by admin #${item.updatedBy}` : ''}
        </p>
      ) : null
    }
  />
);
