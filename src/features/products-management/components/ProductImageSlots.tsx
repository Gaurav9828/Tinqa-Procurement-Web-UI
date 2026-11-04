import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import {
  DEFAULT_IMAGE_BASE,
  IMAGE_DESCRIPTION_MAX,
  IMAGE_EXTENSIONS,
  IMAGE_SLOTS,
  imageName,
  isLegacyImage,
  type ImageEntry,
  type ImageLookup,
  type ImageNaming,
} from '../utils/productImages';

interface ProductImageSlotsProps {
  /** The slots' images as resolved (resolveImages): found in the folder, or kept from before. */
  entries: readonly ImageEntry[];
  /** Whether each slot's image was found in the folder (useFoundImages). */
  lookups: readonly ImageLookup[];
  /** Changes the descriptions (the images themselves come from the folder). */
  onChange: (entries: ImageEntry[]) => void;
  /** The folder address (typed), and the product name and version the names are made from. */
  naming: ImageNaming;
  onBaseChange: (base: string) => void;
  /** Field errors keyed like the backend's (`image1Url`, `image2Description`, …). */
  errors?: Record<string, string>;
  disabled?: boolean;
}

const inputClass =
  'w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white';
const borderClass = (error?: string) => (error ? 'border-rose-500' : 'border-black/10 dark:border-white/10');

/** A small preview of the image address, or a placeholder while it is empty or doesn't load. */
const Thumbnail: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const [failed, setFailed] = useState<string | null>(null);
  const shown = url.trim() && failed !== url;
  return (
    <div className="w-16 h-16 shrink-0 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center overflow-hidden">
      {shown ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(url)} />
      ) : (
        <ImageOff className="w-5 h-5 text-gray-400" aria-hidden="true" />
      )}
    </div>
  );
};

/** What the slot says about its image. */
const lookupNote = (lookup: ImageLookup | undefined, legacy: boolean, name: string | null): { text: string; tone: string } => {
  const types = IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(', ');
  switch (lookup?.state) {
    case 'found':
      return { text: 'Found in the image folder.', tone: 'text-emerald-600 dark:text-emerald-400' };
    case 'checking':
      return { text: 'Looking for it in the image folder…', tone: 'text-gray-500 dark:text-gray-400' };
    case 'missing':
      return legacy
        ? { text: `Saved before images were named; kept until ${name} is in the folder.`, tone: 'text-amber-700 dark:text-amber-400' }
        : { text: `Not in the folder yet: name the picture ${name} (${types}) and put it there.`, tone: 'text-gray-500 dark:text-gray-400' };
    default:
      return { text: 'Enter the product name and the image folder address to name this image.', tone: 'text-gray-500 dark:text-gray-400' };
  }
};

/**
 * The five image slots: each holds the same view on every product (1 front, 2 side, 3 back, 4 close-up, 5 in use) and
 * says what its picture shows, which the storefront shows and Aura reads out in the 3D store. Only the folder address
 * is typed: each slot's name is made from the product name and version (rudrax_v0.1_1), its image is looked for in
 * the folder under that name and shown when found. A missing one shows its name, to rename the file to.
 */
export const ProductImageSlots: React.FC<ProductImageSlotsProps> = ({ entries, lookups, onChange, naming, onBaseChange, errors = {}, disabled }) => {
  const describe = (index: number, description: string) =>
    onChange(entries.map((entry, i) => (i === index ? { ...entry, description } : entry)));
  const baseMissing = !naming.base.trim();

  return (
    <div className="space-y-3">
      <div>
        <p className="block font-medium text-gray-700 dark:text-gray-300">Product images</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          Every product uses the same five views in this order, so the store looks alike and Aura can walk shoppers
          through each one. Image 1 is required; describe what each picture shows.
        </p>
      </div>
      <div>
        <label htmlFor="product-image-base" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
          Image folder address
        </label>
        <input
          id="product-image-base"
          type="text"
          value={naming.base}
          onChange={(e) => onBaseChange(e.target.value)}
          placeholder={DEFAULT_IMAGE_BASE}
          disabled={disabled}
          aria-invalid={baseMissing}
          aria-describedby="product-image-base-hint"
          className={`${inputClass} ${borderClass(baseMissing ? 'missing' : undefined)}`}
        />
        <p id="product-image-base-hint" className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
          {imageName(naming, 0)
            ? 'Each image is named from the product name and version and found in this folder by that name: name your picture files to match.'
            : 'Enter the product name first: each image is named from it and its version (e.g. rudrax_v0.1_1.png).'}
        </p>
      </div>
      {IMAGE_SLOTS.map((slot, index) => {
        const entry = entries[index] ?? { url: '', description: '' };
        const lookup = lookups[index];
        const label = `Image ${index + 1} (${slot.view.toLowerCase()})`;
        const urlError = errors[slot.urlField];
        const descriptionError = errors[slot.descriptionField];
        const hasImage = entry.url.trim() !== '';
        const name = imageName(naming, index);
        const note = lookupNote(lookup, isLegacyImage(entry.url, index), name);
        return (
          <fieldset
            key={slot.urlField}
            data-testid={`image-slot-${index + 1}`}
            data-state={lookup?.state}
            className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-2"
          >
            <legend className="px-1 font-semibold text-black dark:text-white">
              {index + 1} · {slot.view}
              {index === 0 && <span className="text-rose-500"> *</span>}
            </legend>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{slot.shoot}</p>
            <div className="flex items-start gap-3">
              <Thumbnail url={entry.url} alt={slot.view} />
              <div className="flex-1 min-w-0 space-y-2">
                {/* The name, to copy and rename the picture file to (selectable, not editable) */}
                <output
                  aria-label={`${label} file name`}
                  className="block w-full truncate px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 font-mono text-gray-700 dark:text-gray-300 select-all"
                >
                  {name ?? 'Needs the product name'}
                </output>
                <p className={`text-[10px] ${note.tone}`} data-testid={`image-slot-${index + 1}-note`}>
                  {note.text}
                </p>
                {hasImage && (
                  <p className="text-[10px] text-gray-400 truncate" title={entry.url}>
                    {entry.url}
                  </p>
                )}
                {urlError && <p className="text-[10px] text-rose-500">{urlError}</p>}
                <textarea
                  aria-label={`${label} description`}
                  value={entry.description}
                  onChange={(e) => describe(index, e.target.value)}
                  placeholder={hasImage ? slot.example : 'Shown once the image is in the folder'}
                  disabled={disabled || !hasImage}
                  rows={2}
                  maxLength={IMAGE_DESCRIPTION_MAX}
                  aria-invalid={!!descriptionError}
                  className={`${inputClass} ${borderClass(descriptionError)} resize-y disabled:opacity-50`}
                />
                <div className="flex justify-between gap-2 text-[10px]">
                  <span className="text-rose-500">{descriptionError}</span>
                  <span className="text-gray-400 shrink-0">
                    {entry.description.length}/{IMAGE_DESCRIPTION_MAX}
                  </span>
                </div>
              </div>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
};
