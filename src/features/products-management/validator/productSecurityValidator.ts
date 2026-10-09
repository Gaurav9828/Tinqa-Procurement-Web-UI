import type { CreateProductRequest, UpdateProductRequest } from '../types/product.types';
import { WARRANTY_TEXT_MAX } from '../types/product.types';

export const validateProductPayload = (payload: CreateProductRequest | UpdateProductRequest): string => {
  if (!payload) {
    return "Product request payload cannot be null.";
  }

  // 1. Title
  if (!payload.title || payload.title.trim() === '') {
    return "Product title is required.";
  }
  const titleError = sanitizeText(payload.title, 150, "Title");
  if (titleError) return titleError;

  // 2. Tagline
  if (payload.tagline) {
    const taglineError = sanitizeText(payload.tagline, 250, "Tagline");
    if (taglineError) return taglineError;
  }

  // 3. Description
  if (payload.description) {
    const descError = sanitizeText(payload.description, 2000, "Description");
    if (descError) return descError;
  }

  // 4. Numeric validation
  if (payload.price === undefined || payload.price === null || !Number.isFinite(Number(payload.price)) || Number(payload.price) < 0) {
    return "Price must be a valid non-negative number.";
  }
  if (payload.discountPercentage !== undefined && payload.discountPercentage !== null) {
    const discount = Number(payload.discountPercentage);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return "Discount percentage must be between 0 and 100.";
    }
  }
  if (payload.stockQuantity === undefined || payload.stockQuantity === null || !Number.isInteger(Number(payload.stockQuantity)) || Number(payload.stockQuantity) < 0) {
    return "Stock quantity must be a whole number and cannot be negative.";
  }

  // 5. Image Validation (Image 1 is mandatory, Image 2-5 are optional)
  if (!payload.image1Url || payload.image1Url.trim() === '') {
    return "Image 1 is required.";
  }
  const image1Error = validateImageString(payload.image1Url, "Image 1");
  if (image1Error) return image1Error;

  // Validate images 2-5 only if they are provided
  const optionalImageChecks = [
    payload.image2Url ? validateImageString(payload.image2Url, "Image 2") : null,
    payload.image3Url ? validateImageString(payload.image3Url, "Image 3") : null,
    payload.image4Url ? validateImageString(payload.image4Url, "Image 4") : null,
    payload.image5Url ? validateImageString(payload.image5Url, "Image 5") : null,
  ];

  for (const err of optionalImageChecks) {
    if (err) return err;
  }

  // 6. Last Update Description
  if (payload.lastUpdateDescription) {
    const updateDescError = sanitizeText(payload.lastUpdateDescription, 255, "Last Update Description");
    if (updateDescError) return updateDescError;
  }

  // 7. Specifications
  if (payload.specifications) {
    for (const spec of payload.specifications) {
      if (spec.specKey) {
        const keyErr = sanitizeText(spec.specKey, 100, "Specification Key");
        if (keyErr) return keyErr;
      }
      if (spec.specValue) {
        const valErr = sanitizeText(spec.specValue, 500, "Specification Value");
        if (valErr) return valErr;
      }
    }
  }

  // 8. Warranties (the form shows these inline first; this is the last line of defence)
  if (payload.warranties) {
    for (const [index, warranty] of payload.warranties.entries()) {
      const label = `Warranty ${index + 1}`;
      if (!['MANUFACTURER', 'SELLER', 'EXTENDED', 'REPLACEMENT', 'SERVICE', 'PARTS', 'LIMITED'].includes(warranty.warrantyType)) {
        return `${label}: select a supported warranty type.`;
      }
      if (!warranty.title?.trim()) return `${label}: title is required.`;
      if (!Number.isInteger(warranty.durationValue) || warranty.durationValue <= 0) return `${label}: duration must be a whole number greater than 0.`;
      if (!['DAYS', 'MONTHS', 'YEARS'].includes(warranty.durationUnit)) return `${label}: duration unit must be Days, Months or Years.`;
      for (const [value, max, field] of [
        [warranty.title, 255, 'title'],
        [warranty.provider, 255, 'provider'],
        [warranty.coverage, WARRANTY_TEXT_MAX, 'coverage'],
        [warranty.exclusions, WARRANTY_TEXT_MAX, 'exclusions'],
        [warranty.termsAndConditions, WARRANTY_TEXT_MAX, 'terms and conditions'],
      ] as const) {
        const error = value ? sanitizeText(value, max, `${label} ${field}`) : null;
        if (error) return error;
      }
    }
  }

  // 9. Components (the form shows these inline first)
  if (payload.components) {
    const seen = new Set<number>();
    for (const [index, component] of payload.components.entries()) {
      if (!Number.isInteger(component.itemId) || component.itemId <= 0) return `Component ${index + 1}: select an item.`;
      if (seen.has(component.itemId)) return `Component ${index + 1}: this item is already listed.`;
      seen.add(component.itemId);
      if (!(Number(component.quantity) > 0)) return `Component ${index + 1}: quantity must be greater than 0.`;
      const nameError = sanitizeText(component.itemName, 150, `Component ${index + 1} item name`);
      if (nameError) return nameError;
      for (const warranty of component.warranties ?? []) {
        for (const [value, max, label] of [
          [warranty.title, 255, 'warranty title'],
          [warranty.provider, 255, 'warranty provider'],
          [warranty.coverage, 20000, 'warranty coverage'],
          [warranty.exclusions, 20000, 'warranty exclusions'],
          [warranty.termsAndConditions, 20000, 'warranty terms'],
        ] as const) {
          const error = value ? sanitizeText(value, max, `Component ${index + 1} ${label}`) : null;
          if (error) return error;
        }
      }
    }
  }

  return ""; // All validation checks passed successfully
};

const sanitizeText = (input: string, maxLength: number, fieldName: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

  if (trimmed.length > maxLength) {
    return `${fieldName} exceeds maximum allowed length of ${maxLength} characters.`;
  }

  // Check for any HTML tags or dangerous angle brackets (< or >)
  // This will catch <html>, <script>, <iframe>, <div>, etc.
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return `Security violation: HTML tags or script patterns are not allowed in ${fieldName}`;
  }

  const lowerCase = trimmed.toLowerCase();
  if (
    lowerCase.includes("javascript:") ||
    lowerCase.includes("onerror=") ||
    lowerCase.includes("onload=")
  ) {
    return `Security violation: Malicious script pattern detected in ${fieldName}`;
  }

  return null;
};

// Strict https-only checks apply to production builds. During local development
// (`npm run dev`) any simple string is accepted, e.g. "chair.png" or "http://localhost/x.jpg".
export const STRICT_IMAGE_URLS = import.meta.env.PROD;

// Optional host allowlist (production only), e.g. VITE_ALLOWED_IMAGE_HOSTS="cdn.tinqa.com,res.cloudinary.com".
const ALLOWED_IMAGE_HOSTS = (import.meta.env.VITE_ALLOWED_IMAGE_HOSTS || '')
  .split(',')
  .map((host: string) => host.trim().toLowerCase())
  .filter(Boolean);

const validateImageString = (imageInput?: string, fieldName?: string): string | null => {
  if (!imageInput || imageInput.trim() === '') {
    return null;
  }
  const sanitized = imageInput.trim();

  if (sanitized.length > 500) {
    return `${fieldName} string length is too long (maximum 500 characters allowed).`;
  }

  if (!STRICT_IMAGE_URLS) {
    // Development: plain strings are fine; only script-capable schemes are refused.
    return /^\s*(javascript|data|vbscript):/i.test(sanitized)
      ? `Security violation: Invalid or malicious pattern detected in ${fieldName}`
      : null;
  }

  // Allowlist, not blocklist: only absolute https URLs are accepted. This rejects
  // javascript:, data:, vbscript:, protocol-relative and obfuscated variants alike.
  let url: URL;
  try {
    url = new URL(sanitized);
  } catch {
    return `${fieldName} must be a valid absolute URL (https://...).`;
  }
  if (url.protocol !== 'https:') {
    return `${fieldName} must use a secure https:// URL.`;
  }
  if (url.username || url.password) {
    return `${fieldName} must not contain embedded credentials.`;
  }
  if (ALLOWED_IMAGE_HOSTS.length && !ALLOWED_IMAGE_HOSTS.includes(url.hostname.toLowerCase())) {
    return `${fieldName} must be hosted on an approved image domain.`;
  }

  return null;
};
