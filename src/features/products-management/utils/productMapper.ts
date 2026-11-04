import type { AccessoryLinkResponse, ProductResponse, ProductResponseDto, SpecificationDTO } from '../types/product.types';

/**
 * The backend stores user-guide lines as specification rows keyed "Guide - <section>"
 * (ProductService.mapToResponseDto splits them back out into `userGuide`).
 */
export const GUIDE_SPEC_PREFIX = 'Guide - ';

/**
 * Rebuilds the backend's storage form (`specifications: [{ specKey, specValue }]`) from the
 * read form (`specs` + `userGuide`). PUT /products/{id} deletes and recreates every row from
 * `specifications`, so anything not carried over here would be lost on the next update.
 */
const toSpecifications = (dto: ProductResponseDto): SpecificationDTO[] => {
  if (Array.isArray(dto.specifications)) return dto.specifications;
  const specs = (dto.specs ?? []).map((spec) => ({ specKey: spec.label, specValue: spec.value }));
  const guide = (dto.userGuide ?? []).flatMap((section) =>
    (section.content ?? []).map((line) => ({ specKey: `${GUIDE_SPEC_PREFIX}${section.title}`, specValue: line }))
  );
  return [...specs, ...guide];
};

/** Maps a product from GET /api/products (ProductResponseDto) to the UI model. */
export const toProduct = (dto: ProductResponseDto): ProductResponse => ({
  id: dto.id,
  title: dto.title,
  tagline: dto.tagline ?? null,
  softwareName: dto.softwareName?.trim() || null,
  softwareVersion: dto.softwareVersion?.trim() || null,
  category: dto.category ?? null,
  description: dto.description ?? null,
  // A draft may not have a price yet
  price: dto.price ?? 0,
  discountPercentage: dto.discountPercentage ?? null,
  hsnSac: dto.hsnSac ?? null,
  gstRate: dto.gstRate === null || dto.gstRate === undefined ? null : Number(dto.gstRate),
  image1Url: dto.image1Url ?? null,
  image2Url: dto.image2Url ?? null,
  image3Url: dto.image3Url ?? null,
  image4Url: dto.image4Url ?? null,
  image5Url: dto.image5Url ?? null,
  image1Description: dto.image1Description ?? null,
  image2Description: dto.image2Description ?? null,
  image3Description: dto.image3Description ?? null,
  image4Description: dto.image4Description ?? null,
  image5Description: dto.image5Description ?? null,
  enabled: !!dto.enabled,
  stockQuantity: dto.stockQuantity ?? 0,
  lastUpdateDescription: dto.lastUpdateDescription ?? dto.last_update_description ?? null,
  specifications: toSpecifications(dto),
  warranties: Array.isArray(dto.warranties) ? dto.warranties : [],
  components: Array.isArray(dto.components) ? dto.components : [],
  createdAt: dto.createdAt ?? null,
  averageRating: Number(dto.averageRating ?? 0) || 0,
  reviewCount: dto.reviewCount ?? 0,
  accessory: !!dto.accessory,
  accessoryPurpose: dto.accessoryPurpose ?? null,
  accessoryBenefits: Array.isArray(dto.accessoryBenefits) ? dto.accessoryBenefits : [],
  accessoryFor: toLinks(dto.accessoryFor),
  accessories: toLinks(dto.accessories),
  modelName: dto.modelName?.trim() || null,
  draft: !!dto.draft,
  versionNumber: Number(dto.versionNumber ?? 1) || 1,
  previousVersionId: dto.previousVersionId ?? null,
  sold: !!dto.sold,
});

const toLinks = (links: AccessoryLinkResponse[] | null | undefined): AccessoryLinkResponse[] =>
  Array.isArray(links)
    ? links.map((link) => ({ ...link, bundleDiscountPercentage: Number(link.bundleDiscountPercentage) || 0 }))
    : [];
