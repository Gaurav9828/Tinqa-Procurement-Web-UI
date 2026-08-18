import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import type { ItemResponse } from '../../features/item-management/types/item.types';

interface Props {
  existingItems: ItemResponse[];
  attributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
}

export const AttributeInputBuilder: React.FC<Props> = ({
  existingItems,
  attributes,
  onChange,
}) => {
  const [currentKey, setCurrentKey] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  // Extract unique historical Keys across all catalog items
  const suggestedKeys = useMemo(() => {
    const keysSet = new Set<string>();
    existingItems.forEach((item) => {
      if (item.attributes) {
        Object.keys(item.attributes).forEach((k) => keysSet.add(k));
      }
    });
    return Array.from(keysSet);
  }, [existingItems]);

  // Extract unique historical Values for the currently selected/entered key
  const suggestedValues = useMemo(() => {
    if (!currentKey.trim()) return [];
    const valuesSet = new Set<string>();
    existingItems.forEach((item) => {
      if (item.attributes && item.attributes[currentKey]) {
        valuesSet.add(String(item.attributes[currentKey]));
      }
    });
    return Array.from(valuesSet);
  }, [existingItems, currentKey]);

  const handleAddAttribute = () => {
    const trimmedKey = currentKey.trim();
    const trimmedValue = currentValue.trim();

    if (!trimmedKey || !trimmedValue) return;

    onChange({
      ...attributes,
      [trimmedKey]: trimmedValue,
    });

    setCurrentKey('');
    setCurrentValue('');
  };

  const handleRemoveAttribute = (keyToRemove: string) => {
    const updated = { ...attributes };
    delete updated[keyToRemove];
    onChange(updated);
  };

  return (
    <div className="space-y-4 border border-black/10 dark:border-white/10 p-4 rounded-xl bg-black/[0.01] dark:bg-white/[0.01]">
      <div className="flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
        <Tag className="w-4 h-4 text-[#0071e3]" /> Custom Specification Attributes
      </div>

      {/* Inputs for adding new Key-Value pair */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Combobox for Key */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Attribute Key
          </label>
          <input
            type="text"
            list="suggested-keys-list"
            placeholder="e.g. Material, Voltage"
            value={currentKey}
            onChange={(e) => setCurrentKey(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <datalist id="suggested-keys-list">
            {suggestedKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>

        {/* Combobox for Value */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Attribute Value
          </label>
          <input
            type="text"
            list="suggested-values-list"
            placeholder="e.g. Plastic, 5V"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <datalist id="suggested-values-list">
            {suggestedValues.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>

        {/* Add Button */}
        <div className="sm:col-span-1 flex items-end">
          <button
            type="button"
            onClick={handleAddAttribute}
            disabled={!currentKey.trim() || !currentValue.trim()}
            className="w-full py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Added Attributes Display */}
      {Object.keys(attributes).length > 0 ? (
        <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
          <span className="text-[11px] font-medium text-gray-500">
            Defined Attributes ({Object.keys(attributes).length}):
          </span>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {Object.entries(attributes).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg text-xs"
              >
                <span className="font-semibold text-black dark:text-white">
                  {key}:
                </span>
                <span className="text-gray-600 dark:text-neutral-300">{val}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(key)}
                  className="p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors ml-1 cursor-pointer"
                  title="Remove Attribute"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 italic">No custom attributes added yet.</p>
      )}
    </div>
  );
};